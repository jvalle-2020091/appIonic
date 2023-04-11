var express = require('express');
var router = express.Router();
const customerController = require("../controllers/customer.controller")
const auth = require('../middlewares/auth');

// Routes 
router.post("/createCustomer", customerController.createCustomer);
router.get("/getCustomers", customerController.getCustomers);
router.put("/updateCustomer/:id", customerController.updateCustomer);
router.delete("/deleteCustomer/:id", customerController.deleteCustomer);

module.exports = router;