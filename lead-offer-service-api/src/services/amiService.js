/**
 * AMI Service - Asterisk Manager Interface Integration
 * Handles real-time call monitoring and events from FreePBX/Asterisk
 */

const AsteriskManager = require('asterisk-manager');
const logger = require('../utils/logger');
const { eventEmitter, EVENT_TYPES } = require('./events');

class AMIService {
  constructor() {
    this.ami = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    
    // Call tracking
    this.activeCalls = new Map();
    this.agentExtensions = new Map(); // extension -> agentId mapping
    this.extensionStatus = new Map(); // extension -> {status, statusText, timestamp}
    this.supervisorSessions = new Map(); // sessionId -> {callId, supervisorExtension, targetExtension, type, channel}
    this.selectedExtensions = new Map(); // agentId -> currently selected extension
    
    // Configuration from environment
    this.config = {
      host: process.env.FREEPBX_HOST || '94.158.246.248',
      port: process.env.AMI_PORT || 5038,
      username: process.env.AMI_USERNAME || 'admin',
      password: process.env.AMI_PASSWORD || 'admin',
      events: 'on'
    };
    
    // Agent-Extension mapping (this should come from database later)
    this.initializeAgentExtensions();
  }

  /**
   * Initialize agent-extension mapping
   * TODO: Load this from database based on current agent assignments
   */
  initializeAgentExtensions() {
    // Default extension mappings - should be loaded from DB
    this.agentExtensions.set('1001', null); // Will be filled when agents log in
    this.agentExtensions.set('1002', null);
    this.agentExtensions.set('1003', null);
    this.agentExtensions.set('1004', null);
  }

  /**
   * Initialize AMI connection
   */
  async initialize() {
    try {
      logger.info('AMI Service: Initializing connection', {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username
      });

      return await this.connect();
    } catch (error) {
      logger.error('AMI Service: Initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Connect to Asterisk Manager Interface
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ami = new AsteriskManager(
          this.config.port,
          this.config.host,
          this.config.username,
          this.config.password,
          true // Enable events
        );

        // Connection event handlers
        this.ami.on('connect', () => {
          logger.info('AMI Service: Connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.setupEventHandlers();
          // Request initial extension status for all known extensions
          this.requestInitialExtensionStatuses();
          // Discover existing active calls
          this.discoverActiveChannels();
          resolve(true);
        });

        this.ami.on('disconnect', () => {
          logger.warn('AMI Service: Disconnected');
          this.isConnected = false;
          this.handleReconnection();
        });

        this.ami.on('error', (error) => {
          logger.error('AMI Service: Connection error', { error: error.message });
          this.isConnected = false;
          reject(error);
        });

        // Initiate connection
        this.ami.connect();

      } catch (error) {
        logger.error('AMI Service: Failed to create connection', { error: error.message });
        reject(error);
      }
    });
  }

  /**
   * Setup event handlers for call monitoring
   */
  setupEventHandlers() {
    logger.info('AMI Service: Setting up event handlers');

    // New call initiated
    this.ami.on('newcallerid', (event) => {
      this.handleNewCallerId(event);
    });

    // Outgoing call started
    this.ami.on('dialbegin', (event) => {
      this.handleDialBegin(event);
    });

    // Outgoing call ended
    this.ami.on('dialend', (event) => {
      this.handleDialEnd(event);
    });

    // Call connected/bridged
    this.ami.on('bridge', (event) => {
      this.handleBridge(event);
    });

    // Call ended
    this.ami.on('hangup', (event) => {
      this.handleHangup(event);
    });

    // Extension status changes
    this.ami.on('extensionstatus', (event) => {
      this.handleExtensionStatus(event);
    });

    // Originate response events (for supervisor sessions)
    this.ami.on('originateresponse', (event) => {
      this.handleOriginateResponse(event);
    });

    // Generic event logging for debugging
    this.ami.on('managerevent', (event) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('AMI Event:', { event: event.event, data: event });
      }
    });
  }

  /**
   * Handle new caller ID event (call initiated)
   */
  handleNewCallerId(event) {
    try {
      logger.info('AMI Event: NewCallerId', { event });

      const { uniqueid, channel, calleridnum, calleridname, context } = event;
      
      // Extract extension from channel
      const extension = this.extractExtensionFromChannel(channel);
      if (!extension) return;

      // Check if this is an agent extension
      const agentId = this.agentExtensions.get(extension);
      
      // Create call session
      const callData = {
        callId: uniqueid,
        uniqueId: uniqueid,
        extension: extension,
        agentId: agentId,
        channel: channel, // Store the actual channel name for ChanSpy
        callerNumber: calleridnum,
        callerName: calleridname,
        context: context,
        status: 'initiated',
        direction: this.determineCallDirection(context, extension),
        startTime: new Date(),
        connectTime: null,
        endTime: null,
        duration: 0,
        leadId: null,
        leadInfo: null
      };

      this.activeCalls.set(uniqueid, callData);

      // Emit real-time event
      this.emitCallEvent('call:initiated', callData);

      logger.info('AMI Service: Call initiated', { callId: uniqueid, extension, agentId });

    } catch (error) {
      logger.error('AMI Service: Error handling NewCallerId', { error: error.message, event });
    }
  }

  /**
   * Handle dial begin event (outgoing call started)
   */
  handleDialBegin(event) {
    try {
      logger.info('AMI Event: DialBegin', { event });

      const { uniqueid, channel, destination } = event;
      const callData = this.activeCalls.get(uniqueid);

      if (callData) {
        callData.status = 'ringing';
        callData.destination = destination;
        
        // Try to associate with lead based on phone number
        this.associateCallWithLead(callData);
        
        this.emitCallEvent('call:ringing', callData);
      }

    } catch (error) {
      logger.error('AMI Service: Error handling DialBegin', { error: error.message, event });
    }
  }

  /**
   * Handle dial end event
   */
  handleDialEnd(event) {
    try {
      logger.info('AMI Event: DialEnd', { event });

      const { uniqueid, dialstatus } = event;
      const callData = this.activeCalls.get(uniqueid);

      if (callData) {
        callData.dialStatus = dialstatus;
        
        if (dialstatus === 'ANSWER') {
          callData.status = 'connected';
          callData.connectTime = new Date();
        }
        
        this.emitCallEvent('call:dial_end', callData);
      }

    } catch (error) {
      logger.error('AMI Service: Error handling DialEnd', { error: error.message, event });
    }
  }

  /**
   * Handle bridge event (call connected)
   */
  handleBridge(event) {
    try {
      logger.info('AMI Event: Bridge', { event });

      const { uniqueid1, uniqueid2, channel1, channel2 } = event;
      
      // Find the call that matches one of the unique IDs
      const callData = this.activeCalls.get(uniqueid1) || this.activeCalls.get(uniqueid2);

      if (callData) {
        callData.status = 'connected';
        callData.connectTime = new Date();
        callData.bridgedChannel = channel1 === callData.channel ? channel2 : channel1;
        
        this.emitCallEvent('call:connected', callData);
        
        logger.info('AMI Service: Call connected', { 
          callId: callData.callId, 
          extension: callData.extension 
        });
      }

    } catch (error) {
      logger.error('AMI Service: Error handling Bridge', { error: error.message, event });
    }
  }

  /**
   * Handle hangup event (call ended)
   */
  handleHangup(event) {
    try {
      logger.info('AMI Event: Hangup', { event });

      const { uniqueid, cause, causecode } = event;
      const callData = this.activeCalls.get(uniqueid);

      if (callData) {
        callData.status = 'ended';
        callData.endTime = new Date();
        callData.hangupCause = cause;
        callData.hangupCode = causecode;
        
        // Calculate duration
        if (callData.connectTime) {
          callData.duration = Math.floor((callData.endTime - callData.connectTime) / 1000);
        }

        this.emitCallEvent('call:ended', callData);
        
        // Remove from active calls after a delay (for final updates)
        setTimeout(() => {
          this.activeCalls.delete(uniqueid);
        }, 5000);

        logger.info('AMI Service: Call ended', { 
          callId: callData.callId, 
          duration: callData.duration,
          cause: cause
        });
      }

      // Check if this hangup is for a supervisor session
      const { channel } = event;
      if (channel) {
        for (const [sessionId, session] of this.supervisorSessions.entries()) {
          if (session.supervisorChannel === channel) {
            logger.info('AMI Service: Supervisor session ended by hangup', { 
              sessionId, 
              channel,
              type: session.type 
            });
            
            // Mark session as terminated and schedule cleanup
            session.status = 'terminated';
            session.endTime = new Date();
            
            setTimeout(() => {
              this.supervisorSessions.delete(sessionId);
            }, 2000);
            break;
          }
        }
      }

    } catch (error) {
      logger.error('AMI Service: Error handling Hangup', { error: error.message, event });
    }
  }

  /**
   * Handle extension status changes
   */
  handleExtensionStatus(event) {
    try {
      const { exten, status, statustext } = event;
      
      logger.info('AMI Event: ExtensionStatus', { 
        extension: exten, 
        status, 
        statusText: statustext 
      });

      // Store extension status for monitoring
      this.extensionStatus.set(exten, {
        status: parseInt(status),
        statusText: statustext,
        timestamp: new Date(),
        isOnline: this.isExtensionOnline(parseInt(status))
      });

      // Emit agent status change - for individual extension
      this.emitCallEvent('agent:status_changed', {
        extension: exten,
        status: parseInt(status),
        statusText: statustext,
        isOnline: this.isExtensionOnline(parseInt(status)),
        timestamp: new Date()
      });

      // Also emit a generic agent status update for the frontend to refresh agent list
      this.emitCallEvent('agent_status_update', {
        extension: exten,
        status: parseInt(status),
        statusText: statustext,
        isOnline: this.isExtensionOnline(parseInt(status)),
        timestamp: new Date(),
        action: 'status_changed'
      });

    } catch (error) {
      logger.error('AMI Service: Error handling ExtensionStatus', { error: error.message, event });
    }
  }

  /**
   * Handle Originate response events to track supervisor session channels
   */
  handleOriginateResponse(event) {
    try {
      const { actionid, response, channel, uniqueid } = event;
      
      logger.debug('AMI Event: OriginateResponse', { 
        actionid, 
        response, 
        channel, 
        uniqueid 
      });

      // Find supervisor session by action ID
      let matchingSession = null;
      for (const [sessionId, session] of this.supervisorSessions.entries()) {
        if (session.actionId === actionid) {
          matchingSession = { sessionId, ...session };
          break;
        }
      }

      if (matchingSession && response === 'Success' && channel) {
        // Update the session with the actual channel name
        this.supervisorSessions.set(matchingSession.sessionId, {
          ...matchingSession,
          supervisorChannel: channel
        });

        logger.info('AMI Service: Supervisor session channel tracked', {
          sessionId: matchingSession.sessionId,
          channel: channel,
          type: matchingSession.type
        });
      }

    } catch (error) {
      logger.error('AMI Service: Error handling OriginateResponse', { 
        error: error.message, 
        event 
      });
    }
  }

  /**
   * Determine if extension is online based on Asterisk status codes
   * Status codes: -1=Not found, 0=Idle, 1=In use, 2=Busy, 4=Unavailable, 8=Ringing, 16=On Hold
   */
  isExtensionOnline(status) {
    // Extension is online if status is 0 (Idle), 1 (In use), 2 (Busy), 8 (Ringing), or 16 (On Hold)
    // Extension is offline if status is -1 (Not found), 4 (Unavailable), or undefined
    return status === 0 || status === 1 || status === 2 || status === 8 || status === 16;
  }

  /**
   * Get extension status for monitoring
   */
  getExtensionStatus(extension) {
    return this.extensionStatus.get(extension) || {
      status: -1,
      statusText: 'Unknown',
      timestamp: new Date(),
      isOnline: false
    };
  }

  /**
   * Get all extension statuses
   */
  getAllExtensionStatuses() {
    const statuses = {};
    this.extensionStatus.forEach((statusData, extension) => {
      statuses[extension] = statusData;
    });
    return statuses;
  }

  /**
   * Request initial extension statuses for all known extensions
   */
  requestInitialExtensionStatuses() {
    if (!this.ami || !this.isConnected) return;

    // Known extensions from the setup
    const knownExtensions = ['1001', '1002', '1003', '1004'];
    
    knownExtensions.forEach(extension => {
      this.ami.action({
        Action: 'ExtensionState',
        Exten: extension,
        Context: 'from-internal' // Default FreePBX context
      }, (err, res) => {
        if (err) {
          logger.warn(`AMI Service: Failed to get extension status for ${extension}`, { error: err.message });
        } else {
          logger.info(`AMI Service: Initial extension status for ${extension}`, { response: res });
          // Process the response if successful
          if (res && res.status !== undefined) {
            this.extensionStatus.set(extension, {
              status: parseInt(res.status),
              statusText: res.statustext || 'Unknown',
              timestamp: new Date(),
              isOnline: this.isExtensionOnline(parseInt(res.status))
            });
          }
        }
      });
    });
  }

  /**
   * Discover existing active channels when AMI connects
   */
  async discoverActiveChannels() {
    try {
      logger.info('AMI Service: Discovering existing active channels');
      
      const action = {
        action: 'CoreShowChannels'
      };

      this.ami.action(action, (err, response) => {
        if (err) {
          logger.error('AMI Service: Failed to get active channels', { error: err.message });
          return;
        }

        if (response && response.events) {
          let discoveredCalls = 0;
          response.events.forEach(event => {
            if (event.event === 'CoreShowChannel') {
              const { uniqueid, channel, calleridnum, calleridname, context } = event;
              
              // Extract extension from channel
              const extension = this.extractExtensionFromChannel(channel);
              if (extension && !this.activeCalls.has(uniqueid)) {
                // Check if this is an agent extension
                const agentId = this.agentExtensions.get(extension);
                
                // Create call session for discovered call
                const callData = {
                  callId: uniqueid,
                  uniqueId: uniqueid,
                  extension: extension,
                  agentId: agentId,
                  callerNumber: calleridnum || 'Unknown',
                  callerName: calleridname || 'Unknown',
                  context: context || 'Unknown',
                  status: 'connected', // Assume connected since it's active
                  direction: this.determineCallDirection(context, extension),
                  startTime: new Date(), // We don't know exact start time
                  connectTime: new Date(),
                  endTime: null,
                  duration: 0,
                  leadId: null,
                  leadInfo: null,
                  discovered: true // Mark as discovered
                };

                this.activeCalls.set(uniqueid, callData);
                discoveredCalls++;

                // Emit real-time event
                this.emitCallEvent('call:discovered', callData);

                logger.info('AMI Service: Discovered active call', { 
                  callId: uniqueid, 
                  extension, 
                  agentId 
                });
              }
            }
          });

          logger.info('AMI Service: Channel discovery completed', { 
            discoveredCalls,
            totalActiveCalls: this.activeCalls.size 
          });
        }
      });

    } catch (error) {
      logger.error('AMI Service: Error during channel discovery', { error: error.message });
    }
  }

  /**
   * Extract extension number from channel name
   */
  extractExtensionFromChannel(channel) {
    if (!channel) return null;
    
    // Handle both formats:
    // - PJSIP/1001-00000001 (active call)
    // - PJSIP/1001 (direct channel reference)
    const match = channel.match(/(?:PJSIP|SIP)\/(\d+)(?:-|$)/);
    return match ? match[1] : null;
  }

  /**
   * Determine call direction based on context and extension
   */
  determineCallDirection(context, extension) {
    // If context is 'from-internal', it's typically outbound
    // If context is 'from-trunk', it's typically inbound
    if (context === 'from-internal') return 'outbound';
    if (context === 'from-trunk') return 'inbound';
    
    // Default determination
    return 'unknown';
  }

  /**
   * Associate call with lead based on phone number
   * TODO: Implement database lookup
   */
  async associateCallWithLead(callData) {
    try {
      // This is where we'll lookup the lead in the database
      // For now, we'll leave it as placeholder
      
      const phoneNumber = callData.destination || callData.callerNumber;
      if (!phoneNumber) return;

      // TODO: Query leads collection for matching phone number
      // const lead = await LeadService.findByPhone(phoneNumber);
      
      // if (lead) {
      //   callData.leadId = lead._id;
      //   callData.leadInfo = {
      //     name: lead.contact_name,
      //     project: lead.project?.name
      //   };
      // }

    } catch (error) {
      logger.error('AMI Service: Error associating call with lead', { 
        error: error.message, 
        callId: callData.callId 
      });
    }
  }

  /**
   * Emit call event to Socket.IO and internal event system
   */
  emitCallEvent(eventType, callData) {
    try {
      // Emit to internal event system
      eventEmitter.emit(EVENT_TYPES.CALL_STATUS_CHANGED, {
        type: eventType,
        data: callData
      });

      // Emit to Socket.IO (will be handled by socket service)
      eventEmitter.emit(EVENT_TYPES.SOCKET_EMIT, {
        event: eventType,
        data: callData,
        room: 'admin' // Only send to admin room
      });

    } catch (error) {
      logger.error('AMI Service: Error emitting call event', { 
        error: error.message, 
        eventType,
        callId: callData.callId 
      });
    }
  }

  /**
   * Handle reconnection logic
   */
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('AMI Service: Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    logger.info(`AMI Service: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        logger.error('AMI Service: Reconnection failed', { error: error.message });
      });
    }, this.reconnectDelay);
  }

  /**
   * Get all active calls
   */
  getActiveCalls() {
    const calls = Array.from(this.activeCalls.values());
    logger.debug('AMI Service: Getting active calls', {
      totalCalls: calls.length,
      callIds: calls.map(call => call.callId),
      isConnected: this.isConnected,
      activeCalls: calls.map(call => ({
        callId: call.callId,
        extension: call.extension,
        status: call.status,
        startTime: call.startTime
      }))
    });
    return calls;
  }

  /**
   * Get call by ID
   */
  getCall(callId) {
    return this.activeCalls.get(callId);
  }

  /**
   * Update agent-extension mapping
   */
  updateAgentExtension(extension, agentId) {
    this.agentExtensions.set(extension, agentId);
    logger.info('AMI Service: Updated agent extension mapping', { extension, agentId });
  }

  /**
   * Update agent's selected/active extension
   */
  updateSelectedExtension(agentId, extension) {
    this.selectedExtensions.set(agentId, extension);
    logger.info('AMI Service: Updated agent selected extension', { agentId, extension });
  }

  /**
   * Get agent's currently selected extension
   */
  getSelectedExtension(agentId) {
    return this.selectedExtensions.get(agentId);
  }

  /**
   * Get connection status
   */
  isAMIConnected() {
    return this.isConnected;
  }

  /**
   * Disconnect from AMI
   */
  disconnect() {
    if (this.ami) {
      this.ami.disconnect();
      this.isConnected = false;
      logger.info('AMI Service: Disconnected');
    }
  }

  /**
   * Send AMI Action command
   * @param {Object} action - AMI action object
   * @returns {Promise} - Promise resolving to AMI response
   */
  async sendAction(action) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.ami) {
        reject(new Error('AMI not connected'));
        return;
      }

      this.ami.action(action, (err, res) => {
        if (err) {
          logger.error('AMI Service: Action failed', { action, error: err.message });
          reject(err);
        } else {
          logger.info('AMI Service: Action successful', { action: action.action, response: res.response });
          resolve(res);
        }
      });
    });
  }

  /**
   * Get active channels from AMI
   * @returns {Promise<Array>} - Promise resolving to array of active channels
   */
  async getActiveChannels() {
    try {
      const action = {
        action: 'CoreShowChannels'
      };

      const result = await this.sendAction(action);
      
      // Parse the result to extract channel information
      const channels = [];
      if (result && result.events) {
        result.events.forEach(event => {
          if (event.event === 'CoreShowChannel') {
            channels.push({
              channel: event.channel,
              uniqueid: event.uniqueid,
              callid: event.linkedid || event.uniqueid,
              state: event.channelstate,
              context: event.context,
              extension: event.extension,
              priority: event.priority,
              application: event.application,
              data: event.applicationdata,
              calleridnum: event.calleridnum,
              calleridname: event.calleridname,
              accountcode: event.accountcode,
              duration: event.duration
            });
          }
        });
      }

      logger.info('AMI Service: Retrieved active channels', { 
        totalChannels: channels.length,
        channels: channels.map(ch => ({ 
          channel: ch.channel, 
          uniqueid: ch.uniqueid, 
          state: ch.state,
          context: ch.context,
          extension: ch.extension,
          calleridnum: ch.calleridnum
        }))
      });

      return channels;

    } catch (error) {
      logger.error('AMI Service: Failed to get active channels', { error: error.message });
      throw new Error(`Failed to retrieve active channels: ${error.message}`);
    }
  }

  /**
   * Spy on a call (listen only) - ChanSpy application
   * @param {string} targetChannel - Channel to spy on
   * @param {string} supervisorExtension - Extension of supervisor who will listen
   * @param {string} sessionId - Unique session identifier
   * @returns {Promise} - Promise resolving to spy result
   */
  async spyOnCall(targetChannel, supervisorExtension, sessionId = null) {
    try {
      logger.info('AMI Service: Initiating call spy', { targetChannel, supervisorExtension, sessionId });

      // Extract extension from target channel if needed
      const targetExt = this.extractExtensionFromChannel(targetChannel) || targetChannel;
      
      // Generate session ID if not provided
      const finalSessionId = sessionId || `spy_${targetExt}_${supervisorExtension}_${Date.now()}`;
      
      // Debug logging to see exact values
      logger.info('AMI Service: Spy call debug', { 
        originalTargetChannel: targetChannel,
        extractedExtension: targetExt,
        chanSpyTarget: `PJSIP/${targetExt}`,
        supervisorExtension,
        sessionId: finalSessionId
      });

      const action = {
        action: 'Originate',
        channel: `PJSIP/${supervisorExtension}`,
        application: 'ChanSpy',
        data: `PJSIP/${targetExt},qE`,
        callerid: `Spy <${supervisorExtension}>`,
        timeout: 30000, // 30 second timeout
        async: true,
        variable: `SUPERVISOR_SESSION_ID=${finalSessionId}` // Track session in channel variables
      };

      const result = await this.sendAction(action);
      
      // Track the supervisor session
      this.supervisorSessions.set(finalSessionId, {
        type: 'spy',
        targetChannel,
        targetExtension: targetExt,
        supervisorExtension,
        sessionId: finalSessionId,
        startTime: new Date(),
        status: 'active',
        supervisorChannel: null, // Will be populated by event handler
        actionId: result.actionid // Track the AMI action ID
      });
      
      logger.info('AMI Service: Call spy initiated successfully', { 
        targetChannel, 
        supervisorExtension,
        sessionId: finalSessionId,
        result: result.response 
      });

      return { ...result, sessionId: finalSessionId };

    } catch (error) {
      logger.error('AMI Service: Failed to initiate call spy', { 
        targetChannel, 
        supervisorExtension, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Whisper to agent during call
   * @param {string} targetChannel - Channel to whisper to
   * @param {string} supervisorExtension - Extension of supervisor
   * @param {string} sessionId - Unique session identifier
   * @returns {Promise} - Promise resolving to whisper result
   */
  async whisperToAgent(targetChannel, supervisorExtension, sessionId = null) {
    try {
      logger.info('AMI Service: Initiating whisper', { targetChannel, supervisorExtension, sessionId });

      const targetExt = this.extractExtensionFromChannel(targetChannel) || targetChannel;
      const finalSessionId = sessionId || `whisper_${targetExt}_${supervisorExtension}_${Date.now()}`;

      const action = {
        action: 'Originate',
        channel: `PJSIP/${supervisorExtension}`,
        application: 'ChanSpy',
        data: `PJSIP/${targetExt},qwE`,
        callerid: `Whisper <${supervisorExtension}>`,
        timeout: 30000, // 30 second timeout
        async: true,
        variable: `SUPERVISOR_SESSION_ID=${finalSessionId}`
      };

      const result = await this.sendAction(action);
      
      // Track the supervisor session
      this.supervisorSessions.set(finalSessionId, {
        type: 'whisper',
        targetChannel,
        targetExtension: targetExt,
        supervisorExtension,
        sessionId: finalSessionId,
        startTime: new Date(),
        status: 'active',
        supervisorChannel: null, // Will be populated by event handler
        actionId: result.actionid // Track the AMI action ID
      });
      
      logger.info('AMI Service: Whisper initiated successfully', { 
        targetChannel, 
        supervisorExtension,
        sessionId: finalSessionId,
        result: result.response 
      });

      return { ...result, sessionId: finalSessionId };

    } catch (error) {
      logger.error('AMI Service: Failed to initiate whisper', { 
        targetChannel, 
        supervisorExtension, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Barge into call (conference mode)
   * @param {string} targetChannel - Channel to barge into
   * @param {string} supervisorExtension - Extension of supervisor
   * @param {string} sessionId - Unique session identifier
   * @returns {Promise} - Promise resolving to barge result
   */
  async bargeIntoCall(targetChannel, supervisorExtension, sessionId = null) {
    try {
      logger.info('AMI Service: Initiating barge/conference', { targetChannel, supervisorExtension, sessionId });

      const targetExt = this.extractExtensionFromChannel(targetChannel) || targetChannel;
      const finalSessionId = sessionId || `barge_${targetExt}_${supervisorExtension}_${Date.now()}`;

      const action = {
        action: 'Originate',
        channel: `PJSIP/${supervisorExtension}`,
        application: 'ChanSpy',
        data: `PJSIP/${targetExt},qBE`,
        callerid: `Barge <${supervisorExtension}>`,
        timeout: 30000, // 30 second timeout
        async: true,
        variable: `SUPERVISOR_SESSION_ID=${finalSessionId}`
      };

      const result = await this.sendAction(action);
      
      // Track the supervisor session
      this.supervisorSessions.set(finalSessionId, {
        type: 'barge',
        targetChannel,
        targetExtension: targetExt,
        supervisorExtension,
        sessionId: finalSessionId,
        startTime: new Date(),
        status: 'active',
        supervisorChannel: null, // Will be populated by event handler
        actionId: result.actionid // Track the AMI action ID
      });
      
      logger.info('AMI Service: Barge initiated successfully', { 
        targetChannel, 
        supervisorExtension,
        sessionId: finalSessionId,
        result: result.response 
      });

      return { ...result, sessionId: finalSessionId };

    } catch (error) {
      logger.error('AMI Service: Failed to initiate barge', { 
        targetChannel, 
        supervisorExtension, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Hangup/Disconnect a call
   * @param {string} channel - Channel to hangup
   * @returns {Promise} - Promise resolving to hangup result
   */
  async hangupCall(channel) {
    try {
      logger.info('AMI Service: Hanging up call', { channel });

      const action = {
        action: 'Hangup',
        channel: channel
      };

      const result = await this.sendAction(action);
      
      logger.info('AMI Service: Call hung up successfully', { 
        channel,
        result: result.response 
      });

      return result;

    } catch (error) {
      logger.error('AMI Service: Failed to hangup call', { 
        channel, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get channel for a specific extension's active call
   * @param {string} extension - Extension number
   * @returns {string|null} - Active channel or null
   */
  getActiveChannelForExtension(extension) {
    for (const [callId, call] of this.activeCalls) {
      if (call.extension === extension && call.status !== 'ended') {
        return call.channel || `PJSIP/${extension}`;
      }
    }
    return null;
  }

  /**
   * Get supervisor extension from user info
   * @param {Object} user - User object with extension info
   * @returns {string|null} - Extension number or null
   */
  getSupervisorExtension(user) {
    // This should ideally come from user's assigned extension
    // For now, using a simple mapping (can be enhanced with database lookup)
    const supervisorExtensions = {
      'admin': '1001',  // Admin uses dedicated supervisor extension
      'supervisor': '1002'
    };
    
    return supervisorExtensions[user.login] || user.extension || '1001';
  }

  /**
   * Get all active supervisor sessions with validation
   * @returns {Promise<Array>} - Promise resolving to array of active supervisor sessions
   */
  async getActiveSupervisorSessions() {
    try {
      // Clean up dead sessions before returning active ones
      await this.cleanupDeadSupervisorSessions();
      
      const sessions = Array.from(this.supervisorSessions.values());
      logger.debug('AMI Service: Getting active supervisor sessions', {
        totalSessions: sessions.length,
        sessionIds: sessions.map(s => s.sessionId)
      });
      return sessions;
    } catch (error) {
      logger.warn('AMI Service: Error validating supervisor sessions, returning cached data', { 
        error: error.message 
      });
      const sessions = Array.from(this.supervisorSessions.values());
      return sessions;
    }
  }

  /**
   * Clean up dead supervisor sessions by checking actual FreePBX channels
   * @returns {Promise} - Promise resolving when cleanup is complete
   */
  async cleanupDeadSupervisorSessions() {
    try {
      if (this.supervisorSessions.size === 0) return;

      // Get all active channels from FreePBX
      const activeChannels = await this.getActiveChannels();
      const activeChannelIds = new Set(activeChannels.map(ch => ch.uniqueid));
      
      // Check each supervisor session
      const sessionsToRemove = [];
      
      for (const [sessionId, session] of this.supervisorSessions.entries()) {
        // Check if session has been running too long without a tracked channel
        const sessionAge = Date.now() - session.startTime.getTime();
        const hasTrackedChannel = session.supervisorChannel;
        
        // If session is older than 30 seconds and has no tracked channel, consider it dead
        if (sessionAge > 30000 && !hasTrackedChannel) {
          logger.info('AMI Service: Removing stale supervisor session (no tracked channel)', {
            sessionId,
            sessionAge: `${Math.round(sessionAge / 1000)}s`,
            type: session.type,
            targetExtension: session.targetExtension
          });
          sessionsToRemove.push(sessionId);
          continue;
        }

        // If session has a tracked channel, verify it still exists
        if (hasTrackedChannel) {
          // Extract unique ID from channel name if possible
          const channelMatch = session.supervisorChannel.match(/(\d+\.\d+)/);
          const channelUniqueId = channelMatch ? channelMatch[1] : null;
          
          if (channelUniqueId && !activeChannelIds.has(channelUniqueId)) {
            logger.info('AMI Service: Removing dead supervisor session (channel not found)', {
              sessionId,
              supervisorChannel: session.supervisorChannel,
              channelUniqueId,
              type: session.type,
              targetExtension: session.targetExtension
            });
            sessionsToRemove.push(sessionId);
          }
        }
      }

      // Remove dead sessions
      for (const sessionId of sessionsToRemove) {
        this.supervisorSessions.delete(sessionId);
      }

      if (sessionsToRemove.length > 0) {
        logger.info('AMI Service: Cleaned up dead supervisor sessions', {
          removedCount: sessionsToRemove.length,
          remainingCount: this.supervisorSessions.size
        });
      }

    } catch (error) {
      logger.error('AMI Service: Error during supervisor session cleanup', { 
        error: error.message 
      });
    }
  }

  /**
   * Get supervisor sessions for a specific supervisor
   * @param {string} supervisorExtension - Supervisor extension
   * @returns {Array} - Array of sessions for the supervisor
   */
  getSupervisorSessionsByExtension(supervisorExtension) {
    const sessions = Array.from(this.supervisorSessions.values())
      .filter(session => session.supervisorExtension === supervisorExtension);
    
    logger.debug('AMI Service: Getting supervisor sessions by extension', {
      supervisorExtension,
      sessionCount: sessions.length,
      sessionIds: sessions.map(s => s.sessionId)
    });
    
    return sessions;
  }

  /**
   * Terminate a supervisor session
   * @param {string} sessionId - Session ID to terminate
   * @returns {Promise} - Promise resolving to termination result
   */
  async terminateSupervisorSession(sessionId) {
    try {
      const session = this.supervisorSessions.get(sessionId);
      if (!session) {
        // Session not found in memory - might be stale, try cleanup
        await this.cleanupDeadSupervisorSessions();
        throw new Error(`Supervisor session ${sessionId} not found`);
      }

      logger.info('AMI Service: Terminating supervisor session', { 
        sessionId, 
        type: session.type,
        supervisorExtension: session.supervisorExtension,
        targetExtension: session.targetExtension
      });

      // Use the tracked supervisor channel if available, otherwise try to find it
      let channelToHangup = session.supervisorChannel;
      
      if (!channelToHangup) {
        // Fallback: try to find active channels for this supervisor extension
        logger.warn('AMI Service: No tracked channel for session, attempting alternative termination', { sessionId });
        
        // Try to find any active channels that might be related to this supervisor
        try {
          const channelListAction = {
            action: 'CoreShowChannels'
          };
          
          const channelList = await this.sendAction(channelListAction);
          if (channelList && channelList.events) {
            // Look for channels belonging to this supervisor extension
            for (const channelEvent of channelList.events) {
              if (channelEvent.channel && channelEvent.channel.includes(session.supervisorExtension)) {
                channelToHangup = channelEvent.channel;
                logger.info('AMI Service: Found supervisor channel via channel list', { 
                  sessionId, 
                  channel: channelToHangup 
                });
                break;
              }
            }
          }
        } catch (channelListError) {
          logger.warn('AMI Service: Failed to get channel list', { error: channelListError.message });
        }
        
        // Final fallback
        if (!channelToHangup) {
          channelToHangup = `PJSIP/${session.supervisorExtension}`;
        }
      }
      
      logger.info('AMI Service: Attempting to hang up channel', { 
        sessionId, 
        channel: channelToHangup 
      });

      const action = {
        action: 'Hangup',
        channel: channelToHangup
      };

      try {
        const result = await this.sendAction(action);

        // Mark session as terminated
        session.status = 'terminated';
        session.endTime = new Date();
        
        // Remove from active sessions immediately since hangup was successful
        this.supervisorSessions.delete(sessionId);

        logger.info('AMI Service: Supervisor session terminated successfully', { 
          sessionId,
          result: result.response 
        });

        return { success: true, sessionId, result };

      } catch (hangupError) {
        // Handle "No such channel" and similar errors gracefully
        if (hangupError.message.includes('No such channel') || 
            hangupError.message.includes('not found') ||
            hangupError.message.includes('does not exist')) {
          
          logger.info('AMI Service: Channel already terminated, cleaning up session', { 
            sessionId,
            channel: channelToHangup,
            error: hangupError.message
          });

          // Mark as terminated and remove from tracking since channel is already gone
          session.status = 'terminated';
          session.endTime = new Date();
          this.supervisorSessions.delete(sessionId);

          return { success: true, sessionId, message: 'Session already terminated' };
        } else {
          // Re-throw other errors
          throw hangupError;
        }
      }

    } catch (error) {
      logger.error('AMI Service: Failed to terminate supervisor session', { 
        sessionId, 
        error: error.message 
      });
      
      // Clean up session even if termination failed
      this.supervisorSessions.delete(sessionId);
      
      throw error;
    }
  }

  /**
   * Terminate all supervisor sessions for a specific supervisor
   * @param {string} supervisorExtension - Supervisor extension
   * @returns {Promise} - Promise resolving to termination results
   */
  async terminateAllSupervisorSessions(supervisorExtension) {
    try {
      const sessions = this.getSupervisorSessionsByExtension(supervisorExtension);
      
      logger.info('AMI Service: Terminating all supervisor sessions', { 
        supervisorExtension,
        sessionCount: sessions.length 
      });

      const results = [];
      for (const session of sessions) {
        try {
          const result = await this.terminateSupervisorSession(session.sessionId);
          results.push(result);
        } catch (error) {
          logger.error('AMI Service: Failed to terminate session', { 
            sessionId: session.sessionId, 
            error: error.message 
          });
          results.push({ success: false, sessionId: session.sessionId, error: error.message });
        }
      }

      return results;

    } catch (error) {
      logger.error('AMI Service: Failed to terminate all supervisor sessions', { 
        supervisorExtension, 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = new AMIService();
