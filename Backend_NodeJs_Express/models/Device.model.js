const { Model, DataTypes } = require("sequelize");
const sequelize = require("../bin/sequelize");

class Device extends Model {}
Device.init({
    uuid: { type: DataTypes.STRING(255), primaryKey: true },
    name: DataTypes.STRING(255),
    biometric: DataTypes.BOOLEAN
}, {
    sequelize,
    modelName: "Device"
});

module.exports = Device;