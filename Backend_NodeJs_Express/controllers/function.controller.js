const Function = require("../models/Functions.model");
const Module = require("../models/Module.model");
const Role_Functions = require("../models/Role_Functions.model");
const Rol = require('../models/Rol.model');
const User = require('../models/User.model');
const Role_Function = require("../models/Role_Functions.model");
const User_Rol = require("../models/User_Rol.model");
const validate = require('../utils/validate');
const { v4: uuidv4 } = require("uuid");
const nodemailer = require('nodemailer');
require("dotenv").config();

exports.insertsFunctions = async (req, res) => {
    try {
        this.createModule();
        const functions = await Function.findAll();
        if (functions.length == 0) {
            const array = this.arrayFunctions();
            for (let i = 0; i < array.length; i++) {
                const newFunction = await Function.create(array[i]);
            }
        }
        this.insertRole();
        this.insertUser();
    } catch (err) {
        return err;
    }
}

exports.arrayFunctions = () => {
    const arrayFunctions = [
        // USERS
        {
            name: "Users",
            description: "Función padre de las funciones de usuario.",
            nivel: 1,
            ModuleId: 1
        },
        {
            name: "Get users",
            description: "Permite obtener los usuarios.",
            nivel: 2,
            ModuleId: 1,
            FunctionId: 1
        },
        {
            name: "User creation",
            description: "Permite la creación de un nuevo Usuario.",
            nivel: 2,
            ModuleId: 1,
            FunctionId: 1
        },
        {
            name: "Change of password",
            description: "Permite realizar la solicitud de cambio de contraseña.",
            nivel: 2,
            ModuleId: 1,
            FunctionId: 1
        },
        {
            name: "User blocking",
            description: "Permite realizar el bloqueo o desbloqueo de un usuario.",
            nivel: 2,
            ModuleId: 1,
            FunctionId: 1
        },
        {
            name: "User Edition",
            description: "Permite la edición de un usuario.",
            nivel: 2,
            ModuleId: 1,
            FunctionId: 1
        },
        {
            name: "Deletion of users",
            description: "Permite la eliminación de un usuario.",
            nivel: 2,
            ModuleId: 1,
            FunctionId: 1
        },
        // ROLES
        {
            name: "Roles",
            description: "Función padre de las funciones de rol.",
            nivel: 1,
            ModuleId: 1
        },
        {
            name: "Get Roles",
            description: "Permite la obtención de un roles.",
            nivel: 2,
            ModuleId: 1,
            FunctionId: 8
        },
        {
            name: "Role creation",
            description: "Permite la creación de un roles.",
            nivel: 2,
            ModuleId: 1,
            FunctionId: 8
        },
        {
            name: "Get users by role",
            description: "Permite obtener los usuarios asignados a un rol.",
            nivel: 2,
            ModuleId: 1,
            FunctionId: 8
        },
        {
            name: "Permission Assignment",
            description: "Permite la asignación de permisos a un rol.",
            nivel: 2,
            ModuleId: 1,
            FunctionId: 8
        },
        {
            name: "Role edition",
            description: "Permite la edición de un rol.",
            nivel: 2,
            ModuleId: 1,
            FunctionId: 8
        },
        {
            name: "Role removal",
            description: "Permite la eliminación de un rol.",
            nivel: 2,
            ModuleId: 1,
            FunctionId: 8
        }
    ];
    return arrayFunctions;
}

exports.getFunctions = async (req, res) => {
    try {
        const idRol = req.params.idRol
        const modules = await Module.findAll()
        const functions = await Function.findAll()

        const functionsRols = await Role_Functions.findAll({
            where: {
                RolId: idRol
            }
        })

        const arrayModules = modules.map((_module) => {
            const functionsModule = functions.filter((_function) => _function.ModuleId === _module.id)
            const idFunctionsRols = functionsRols.map((_function) => { return _function.FunctionId })

            const arrayFunctions = functionsModule.map((_function) => {
                return {
                    id: _function.id,
                    name: _function.name,
                    include: idFunctionsRols.includes(_function.id),
                    nivel: _function.nivel,
                    ModuleId: _function.ModuleId,
                    FunctionId: _function.FunctionId
                }
            })

            arrayFunctions.sort((x, y) => {
                if(x.FunctionId !=null){
                    if (x.include < y.include) return 1
                    if (x.include > y.include) return -1
                }
                return 0
            })

            return {
                id: _module.id,
                name: _module.name,
                arrayFunctions
            }
        })

        return res.status(200).send({ arrayModules });
    } catch (err) {
        return err;
    }
}

exports.assignPermissions = async (req, res) => {
    try {
        const idRol = req.params.idRol;
        const deleteRol_Function = await Role_Functions.destroy({
            where: {
                RolId: [idRol]
            }
        });
        //Se almacenan todas la funciones (Id unicamente) seleccionadas para dicho rol
        const idsPermissionsArray = req.body.idsPermissionsArray;
        for (let i = 0; i < idsPermissionsArray.length; i++) {
            let data = {
                FunctionId: idsPermissionsArray[i],
                RolId: idRol
            }
            const role_function = await Role_Functions.create(data);
        }
        return res.status(200).send({ message: res.i18n.t('Post_user_200') });
    } catch (err) {
        return err;
    }
}

exports.insertRole = async () => {
    try {
        const roles = await Rol.findAll();
        if (roles.length == 0) {
            const data = {
                name: 'ADMIN',
                description: 'Este es un rol por defecto con todas las funcionalidades',
            }
            const newRole = await Rol.create(data);

            //Asignarle todas las funciones al nuevo rol
            const idsPermissions = await Function.findAll();

            for (let i = 0; i < idsPermissions.length; i++) {
                let data = {
                    FunctionId: idsPermissions[i].id,
                    RolId: newRole.id
                }
                let role_function = await Role_Function.create(data);
            }
        }

    } catch (error) {
        return error;
    }
}

exports.insertUser = async () => {
    try {
        const users = await User.findAll();
        if (users.length == 0) {
            const tempPassword = uuidv4().substring(0, 8);
            const data = {
                username: process.env.USER_NAME,
                firstName: process.env.FIRSTNAME,
                lastName: process.env.LASTNAME,
                mail: process.env.MAIL,
                password: await validate.encrypt(tempPassword),
                activated: false,
                loginAttemps: 0,
                isLocked: false,
                lockUntil: 0,
                deleted: false,
                needChangePassword: true
            }
            const newUser = await User.create(data);

            //Asignarle un rol
            const data_rol = {
                UserId: newUser.id,
                RolId: 1
            }
            const user_rol = await User_Rol.create(data_rol);

            //Enviar credenciales
            this.sendCredentials(newUser, tempPassword);
        }

    } catch (error) {
        return error;
    }
}

//ENVIAR CREDENCIALES POR CORREO
exports.sendCredentials = async (user, tempPassword) => {
    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            secure: true,
            auth: {
                user: process.env.USERMAIL,
                pass: process.env.PASSMAIL
            }
        });

        let mail_options = {
            from: process.env.FROM_MAIL,
            to: user.mail,
            subject: `Bienvenido `,
            html: 'Hola' + ' ' + user.firstName + ' ' + user.lastName + ', ' + 'gusto en saludarte,' +
                ' <br>' +
                ' <br>' + '• Usuario:' + ' ' + user.username +
                ' <br>' + '• Tu contraseña temporal es:' + ' ' + tempPassword +
                ' <br>' +
                ' <br>' + 'Saludos Cordiales,'
        };

        transporter.sendMail(mail_options, (error, info) => {
            if (error) console.log(error);
            console.log('El correo se envío correctamente ' + info.response);
        });
    } catch (error) {
        console.log(error);
        return error;
    }
}

//creación de módulo
exports.createModule = async () => {
    try {
        const modules = await Module.findAll();
        if (modules.length == 0) {
            const data = {
                name: 'Módulo Administración',
            }
            const newModule = await Module.create(data);

        }
    } catch (err) {

    }
}