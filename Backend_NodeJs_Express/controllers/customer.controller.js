const Customer = require("../models/Customer.model");
const validate = require('../utils/validate');

exports.createCustomer = async (req, res) => {
    try {
        const { name, mail, mobile } = req.body;
        const data = {
            name,
            mail,
            mobile
        }
        const msg = await validate.validateData(data);
        if (msg) return res.status(400).send(msg);
        const searchCustomer = await Customer.findOne({
            where: {
                mail: mail
            }
        });
        if (searchCustomer) return res.status(400).send({ message: 'Ya existe un cliente con este correo' });
        let createCustomer = await Customer.create(data);
        return res.status(200).send({ message: 'El cliente se ha creado exitosamente', createCustomer });
    } catch (err) {
        console.log(err);
        return err;
    }
}

exports.getCustomers = async (req, res) => {
    try {
        const customers = await Customer.findAll();
        return res.status(200).send({ customers });
    } catch (error) {
        console.log(error);
        return error
    }
}

exports.updateCustomer = async (req, res) => {
    try {
        const idCustomer = req.params.id;
        const params = req.body;
        const customerExist = await Customer.findOne({
            where: {
                id: idCustomer
            }
        });
        if (!customerExist) return res.status(400).send({ message: 'No existe este cliente para actualizar' });
        await Customer.update(params, {
            where: {
                id: idCustomer
            }
        });
        return res.status(200).send({ message: 'Actualizado satisfactoriamente' })
    } catch (error) {
        console.log(error);
        return error;
    }
}

exports.deleteCustomer = async (req, res) => {
    try {
        const idCustomer = req.params.id;
        const customerExist = await Customer.findOne({
            where: {
                id: idCustomer
            }
        });

        if (!customerExist) return res.status(400).send({ message: 'Este cliente ya fue eliminado' });

        Customer.destroy({
            where: {
                id: idCustomer
            }
        });
        return res.status(200).send({ message: 'Eliminado exitosamente' });
    } catch (error) {
        console.log(error);
        return error;
    }
}
