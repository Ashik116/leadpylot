const assignLeadsService = require('./assignLeadsService');
// const userService = require('./userService');
// const projectService = require('./projectService');
  // const settingsService = require('./settingsService');
const leadService = require('./leadService/index');
const reclamationService = require('./reclamationService');
// const bankService = require('./bankService');
const openingService = require('./openingService');
const confirmationService = require('./confirmationService');
const paymentVoucherService = require('./paymentVoucherService');
const offerService = require('./offerService');
const cashflowIntegration = require('./cashflowIntegration');
// const pdfService = require('./pdfService');
// const activityService = require('./activityService/index');
// const sourceService = require('./sourceService');
// const transactionService = require('./transactionService');
// const voipService = require('./voipService');
// const EmailSystemService = require('./emailSystemService');

module.exports = {
  assignLeadsService,
  // userService,
  // projectService,
  // settingsService,
  leadService,
  reclamationService,
  // bankService,
  openingService,
  confirmationService,
  paymentVoucherService,
  offerService,
  cashflowIntegration,
  // pdfService,
  // activityService,
  // sourceService,
  // transactionService,
  // voipService,
  // EmailSystemService,
};
