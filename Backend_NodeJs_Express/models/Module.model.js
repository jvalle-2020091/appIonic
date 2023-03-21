const { Model, DataTypes } = require("sequelize");
const sequelize = require("../bin/sequelize");

class Module extends Model {}
Module.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: DataTypes.STRING(255)
}, {
    sequelize,
    modelName: "Module"
});

module.exports = Module;