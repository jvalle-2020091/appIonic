const { Model, DataTypes } = require("sequelize");
const sequelize = require("../bin/sequelize");

class Customer extends Model {}
Customer.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: DataTypes.STRING(100),
  mail: DataTypes.STRING(100),
  mobile: DataTypes.STRING(100)
}, {
  sequelize,
  modelName: "Customer"
});

module.exports = Customer;