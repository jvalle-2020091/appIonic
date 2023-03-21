const Sequelize = require('sequelize');
require("dotenv").config();

const {NAME, PORTDB, PASSWORD, USER, HOST } = require('../config.js')



const sequelize = new Sequelize(NAME, USER, PASSWORD, {
    host: HOST,
    dialect: process.env.DIALECT,
    port: PORTDB
});

sequelize.sync({ force: false }).then(() => {
    console.log("Sincronizacion y conexión exitosa.");
});

module.exports = sequelize;