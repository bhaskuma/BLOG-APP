const express = require('express')
require('dotenv').config()
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const User = require('./models/User')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const multer = require('multer')
const uploadMiddleware = multer({ dest: 'uploads/' })
const fs = require('fs')
const Post = require('./models/Post')



const salt = bcrypt.genSaltSync(10);
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }))
app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(__dirname + '/uploads'))
app.listen(process.env.PORT, () => {
    mongoose.connect(process.env.URL)
    console.log(`port is running on ${process.env.PORT}`)
})


app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {

        const doc = await User.create({
            username,
            password: bcrypt.hashSync(password, salt)
        })
        res.status(200).json({ message: 'succesful register', doc })
    } catch (error) {
        res.status(500).json({ message: 'error in register in backend', error })
    }


})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const userDoc = await User.findOne({ username });
    if (!userDoc) {
        res.status(404).json({ message: 'please register agian' })
    }


    const passOk = bcrypt.compareSync(password, userDoc.password)
    if (passOk) {
        jwt.sign({ username, id: userDoc._id }, process.env.KEY, {}, (err, token) => {
            if (err) throw err;
            res.cookie("token", token).json({ id: userDoc._id, username });
        });
    }
    else {
        res.status(504).json({ message: 'wrong credentials' })
    }
})

app.get('/profile', (req, res) => {
    const { token } = req.cookies;
    jwt.verify(token, process.env.KEY, {}, (err, info) => {
        if (err) throw err;
        res.json(info)
    })
    res.json(req.cookies);
})


app.post('/logout', (req, res) => {
    res.cookie("token", "").json('ok');
})


app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.' + ext;
    fs.renameSync(path, newPath);

    const { token } = req.cookies;
    jwt.verify(token, process.env.KEY, {}, async (err, info) => {
        if (err) throw err;
        const { title, summary, content } = req.body
        const postDoc = await Post.create({
            title, summary, content, cover: newPath, author: info.id
        })
        res.json(postDoc)

    })

})


app.get('/post', async (req, res) => {
    res.json(await Post.find().populate('author', ['username']).sort({ createdAt: -1 })
        .limit(20))
})

app.get('/post/:id', async (req, res) => {
    const { id } = req.params;
    const postDoc = await Post.findById(id).populate('author', ['username']);
    res.json(postDoc);
})