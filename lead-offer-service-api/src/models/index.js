const Appointment = require('./Appointment');
const AssignLeads = require('./AssignLeads');
const Bank = require('./Bank');
const Favourite = require('./Favourite');
const ImportHistory = require('./ImportHistory');
const Lead = require('./Lead');
const LeadAIContext = require('./LeadAIContext');
const LeadAISummaryHistory = require('./LeadAISummaryHistory');
const Offer = require('./Offer');
const Reclamation = require('./Reclamation');
const { Settings } = require('./Settings');
const Team = require('./Team');
const User = require('./User');
const Todo = require('./Todo');
const Source = require('./Source');
const { Transaction } = require('./transaction');
const Confirmation = require('./Confirmation');
const PaymentVoucher = require('./PaymentVoucher');
const UserInactivity = require('./UserInactivity');
const OfferImportHistory = require('./offerImportHistory');
const Document = require('./Document');
const Email = require('./Email');
const Opening = require('./Opening');
const Netto1 = require('./Netto1');
const Netto2 = require('./Netto2');
const Lost = require('./Lost');
const PdfTemplate = require('./pdfTemplate');
const GeneratedPdf = require('./generatedPdf');
const LeadTransfer = require('./leadTransfer');
const QueueTop = require('./queueTop');
const {Activity, ACTIVITY_TYPES, ACTIVITY_ACTIONS, VISIBILITY, ACTIVITY_TYPE_STATUS} = require('./activity');
const {
  TaskServiceActivity,
  TASK_ACTIVITY_TYPES,
  TASK_ACTIVITY_ACTIONS,
  TASK_VISIBILITY,
  TASK_ACTIVITY_TYPE_STATUS,
} = require('./TaskServiceActivity');
const AgentQueuePosition = require('./agentQueuePosition');
const Task = require('./Task');
const PredefinedSubTask = require('./PredefinedSubTask');
const Board = require('./Board');
const List = require('./List');

module.exports = {
  Appointment,
  AssignLeads,
  Bank,
  Favourite,
  ImportHistory,
  Lead,
  LeadAIContext,
  LeadAISummaryHistory,
  Offer,
  Reclamation,
  Settings,
  Team,
  User,
  Todo,
  Source,
  Transaction,
  Activity,
  Confirmation,
  PaymentVoucher,
  UserInactivity,
  OfferImportHistory,
  Document,
  Email,
  Opening,
  Netto1,
  Netto2,
  Lost,
  PdfTemplate,
  GeneratedPdf,
  LeadTransfer,
  QueueTop,
  ACTIVITY_TYPES,
  ACTIVITY_ACTIONS,
  VISIBILITY,
  ACTIVITY_TYPE_STATUS,
  // Task Service Activity (for dual logging to todo-board-service collection)
  TaskServiceActivity,
  TASK_ACTIVITY_TYPES,
  TASK_ACTIVITY_ACTIONS,
  TASK_VISIBILITY,
  TASK_ACTIVITY_TYPE_STATUS,
  AgentQueuePosition,
  Task,
  PredefinedSubTask,
  Board,
  List,
};
