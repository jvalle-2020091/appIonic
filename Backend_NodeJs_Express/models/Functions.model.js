const { Model, DataTypes } = require("sequelize");
const sequelize = require("../bin/sequelize");

class Function extends Model {}
Function.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: DataTypes.STRING(255),
    description: DataTypes.STRING(255),
    nivel: DataTypes.INTEGER,
}, {
    sequelize,
    modelName: "Function"
});

module.exports = Function;