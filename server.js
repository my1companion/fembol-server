const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const fs = require("fs");
const { promisify } = require("util");
const pipeline = promisify(require("stream").pipeline ); 
const multer = require('multer');
const path = require('path');
const db = require('knex')({
    client: 'pg',
    connection: {
        host : '127.0.0.1',
        user : 'postgres',
        password : 'my1companion',
        database : 'fembol'
}
});

const storage = multer.diskStorage({
	destination: (req, file,  cb) =>{
		cb(null, "public/images")
	},
	filename: (req, file, cb) =>{
		console.log(file)
		cb(null, Date.now()+ path.extname(file.originalname))
	}
})

const upload = multer({storage:storage});
const app = express();


app.use(cors()); 
app.use(express.static('public'));
app.use(bodyParser.json());


app.get("/", (req,res) =>{
 res.send("hello adeyinka");
}) 

//const upload = multer();
app.post("/upload", upload.single('file'), (req,res,next) =>{

	const {file, body: {title, blogText, captionText, userId}} = req;

	if(!file || !title || !blogText || !captionText || !userId ){
		return res.status(400).json('Form not filled correctly');
	}
			db.insert({
				user_id: userId,
				content:blogText,
				caption_url: "images/"+file.filename,
				title:title,
				caption_text:captionText,
				status: 1,
				created_at: new Date(),
				modified_at: new Date()
			}).into('blogs')
			.then(blog =>{
				 res.json("success");
			})
			.catch(err =>{
				 res.status(400).json(err);
			})

// 	console.log("public/images/"+file.filename);

	//res.send('file uploaded as ');
	
})

app.post("/updatepost", (req,res,next) =>{

	const {body: {title, blogText, captionText, id}} = req;

	if(!title || !blogText || !captionText){
		return res.status(400).json('Form not filled correctly');
	}
			db ('blogs')
			.where('id', '=', id)
			.update({
				content:blogText,
				title:title,
				caption_text:captionText,
				modified_at: new Date()
			})
			.then(blog =>{
				 res.json("success");
			})
			.catch(err =>{
				 res.status(400).json(err);
			})


	//res.send('file uploaded as ');
	
})

app.post("/updatepostupload", upload.single('file'), (req,res,next) =>{

	const {file, body: {title, blogText, captionText, id}} = req;

	if(!file || !title || !blogText || !captionText || !id ){
		return res.status(400).json('Form not filled correctly');
	}
			db ('blogs')
			.where('id', '=', id)
			.update({
				caption_url: "images/"+file.filename,
				content:blogText,
				title:title,
				caption_text:captionText,
				modified_at: new Date()
			})
			.then(blog =>{
				 res.json("success");
			})
			.catch(err =>{
				 res.status(400).json(err);
			})

 	console.log("public/images/"+file.filename);

	//res.send('file uploaded as ');
	
})

app.post("/unpublish", (req,res,next) =>{

	const {body: {id}} = req;

	if(!id){
		return res.status(400).json('Operation failed');
	}
			db ('blogs')
			.where('id', '=', id)
			.update({
				status:2,
				modified_at: new Date()
			})
			.then(blog =>{
				 res.json(blog);
			})
			.catch(err =>{
				 res.status(400).json(err);
			})


	//res.send('file uploaded as ');
	
})

app.post("/publish", (req,res,next) =>{

	const {body: {id}} = req;

	if(!id){
		return res.status(400).json('Operation failed');
	}
			db ('blogs')
			.where('id', '=', id)
			.update({
				status:1,
				modified_at: new Date()
			})
			.then(blog =>{
				 res.json(blog);
			})
			.catch(err =>{
				 res.status(400).json(err);
			})


	//res.send('file uploaded as ');
	
})


app.post("/register", (req,res) =>{
	const { email, firstName, lastName, password , role} = req.body;
	if(!email || !password || !firstName || !lastName || !role){
		return res.status(400).json('credentials not set');
	}
	var salt = bcrypt.genSaltSync(10);
	const hash = bcrypt.hashSync(password, salt);

		db.transaction(trx=>{
			trx.insert({
				hash: hash,
				email:email,
				status: 1,
				created_at: new Date(),
				modified_at: new Date()
			}).into('login')
			.returning('email')
			.then(loginEmail=>{
				return trx('users')
				.returning('*')
				.insert({
					email: loginEmail[0].email,
					first_name:firstName,
					last_name: lastName,
					created_at: new Date(),
					modified_at: new Date(),
					status:1,
					role: role,
					post_count: 0
				})
				.then(user =>{
					res.json(user[0]);
				})
			}).then(trx.commit)
			.catch(trx.rollback)
		}).catch(err=>{
			res.status(400).json(err);
	
		})

})


app.post("/login", (req, res) => {
	const { email, password} =  req.body;

	if(!email || !password){
		return res.status(400).json('credentials not set');
	}

	var salt = bcrypt.genSaltSync(10);
	const hash = bcrypt.hashSync(password, salt);

	db.select('email','hash').from('login').where({email: email})
	.then(data => {

		const isValid = bcrypt.compareSync(password, data[0].hash);

		if(!isValid){

			return res.status(400).json("Invalid Credentials")

		}else{

			db.select('*').from('users').where({email:email})
			.then(users=>{
				res.json(users[0]);
			})
			.catch(err => res.status(400).json('unable to login'))
		}


	})
	.catch(err => res.status(400).json('wrong credentials'))


}) 

app.get("/users", (req, res) => {

			db.select('*').from('users')
			.then(users=>{
				res.json(users);
			})
			.catch(err => res.status(400).json('unable to get user'))

}) 

app.get("/blogs", (req, res) => {

			db.select('*', 'blog.id AS blog_id', 'blog.status AS blog_status').from('blogs AS blog').leftJoin('users AS user', 'user.id', 'blog.user_id')
			.orderBy('blog.id', 'DESC')
			.then(blogs=>{
				res.json(blogs);
			})
			.catch(err => res.status(400).json('unable to get blogs'))

}) 

app.post("/singleblog", (req, res) => {
			db.select('*', 'blog.id AS blog_id', 'blog.status AS blog_status').from('blogs AS blog').leftJoin('users AS user', 'user.id', 'blog.user_id').where('blog.id', '=', req.body.id)
			.then(blogs=>{
				res.json(blogs);
			})
			.catch(err => res.status(400).json('unable to get blogs'))

}) 

app.post("/submitcomment", (req,res,next) =>{

	const {body: {email, firstName, lastName, comment, blog_id}} = req;

	if(!email || !firstName || !lastName || !comment || !blog_id ){
		return res.status(400).json('Form not filled correctly');
	}
			db.insert({
				first_name: firstName,
				last_name: lastName,
				email: email,
				comment: comment,
				blog_id: blog_id,
				status: 1,
				created_at: new Date(),
				modified_at: new Date()
			}).into('comment')
			.then(blog =>{
				 res.json("success");
			})
			.catch(err =>{
				 res.status(400).json(err);
			})


	//res.send('file uploaded as ');
	
})


app.listen(3031, ()=>{
    console.log('app is running');
});