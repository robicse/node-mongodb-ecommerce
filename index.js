const express = require("express");
const cors = require("cors")
require('./db/config')
const User = require("./db/User");
const Product = require("./db/Product");

const Jwt = require('jsonwebtoken');
const jwtKey ='e-com';

const app = express();

app.use(express.json());
app.use(cors());

app.post("/register", async (req, resp)=>{
  let user = new User(req.body);
  let result = await  user.save();
  result = result.toObject();
  delete result.password;
  // resp.send(result);
  Jwt.sign({ result }, jwtKey, { expiresIn: "2h" }, (err, token) => {
    if (err) {
      resp.status(500).send({result: "something went wrong!"})
    }
    resp.status(200).send({result,auth: token})
  });
})

app.post("/login", async (req, resp)=>{
  if(req.body.password && req.body.email){
    let user = await User.findOne(req.body).select("-password");
    if(user){
      Jwt.sign({ user }, jwtKey, { expiresIn: "2h" }, (err, token) => {
        if (err) {
          resp.status(500).send({result: "something went wrong!"})
        }
        resp.status(200).send({user,auth: token})
      });
    }else{
      resp.status(200).send({result:'No User Found'});
    }
  }else{
    resp.status(200).send({result:'No User Found'});
  }
})

app.post(`/add-product`, verifyToken, async (req, resp) => {
  let product = new Product(req.body);
  let result = await product.save();
  resp.send(result);
})

app.get('/products', verifyToken, async (req, resp)=>{
  let products = await Product.find();
  if(products.length>0){
    resp.send(products);
  }else{
    resp.send({result:"No product found"})
  }
})

app.delete("/products/:id", verifyToken, async (req, resp)=>{
  const result = await Product.deleteOne({_id:req.params.id})
  resp.send(result)
})

app.get("/product/:id", verifyToken, async (req, resp)=>{
  const result = await Product.findOne({_id:req.params.id})
  if(result){
    resp.send(result);
  }else{
    resp.send({result:"No product found"})
  }
})

app.put('/product/:id', verifyToken, async (req, resp)=>{
  let result = await Product.updateOne(
    {_id: req.params.id},
    {
      $set: req.body
    }
  )
  resp.send(result)
})

app.get("/search/:key", verifyToken, async (req, resp)=>{
  let result = await Product.find({
    "$or": [
      {name: {$regex: req.params.key}},
      {company: {$regex: req.params.key}},
      {category: {$regex: req.params.key}}
    ]
  });
  resp.send(result)
})

function verifyToken(req, res, next) {
  // const token = req.headers["Authorization"];
  const token = req.headers.authorization;
  if (token) {
    const authToken = token.split(" ")[1];
    Jwt.verify(authToken, jwtKey, (err, valid) => {
      if (err) {
        // console.log("11");
        res.status(401).json({ result: "Please provide valid token" });
      } else {
        // console.log("22");
        // const decodedToken = util.promisify(Jwt.verify)(authToken, jwtKey);
        const decoded = Jwt.verify(authToken, jwtKey);
        // req.user = decoded.userId
        // console.log("decoded", decoded);
        // console.log("decoded?.result", decoded.result);
        req.user = decoded?.result;
        next();
      }
    });
  } else {
    res.status(403).json({ result: "Please add token with headers" });
  }
}

app.listen(5000, () => console.log(`Server ready at: http://localhost:5000`));
