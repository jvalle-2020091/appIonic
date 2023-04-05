const jwt = require("jwt-simple");
require("dotenv").config();
const secretkey = process.env.KEY;

exports.isLoged = async (req, res, next) => {
    if(!req.headers.authorization){
        return res.status(403).send({message: 'The request does not contain the authentication header'})
    }else{
        try{
            let token = req.headers.authorization.replace(/['"]+/g, '');
            let payload = jwt.decode(token, secretkey);
            req.user = payload;
            next();
        }catch(err){
            console.log(err);
            return res.status(404).send({message: 'The token is not valid or has already expired'});
        }
        
    }
}