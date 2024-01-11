const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT;
const storage = multer.memoryStorage(); 

const upload = multer({ storage: storage });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

//////////////////////////////////////////////////////////

const SECRETADMIN = 'SECr3t123';

// Define mongoose models
const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const questionSchema = new mongoose.Schema({
    adminId: String,
    question: {
      type: String,
      required: true,
    },
    options: [],
    imageSolution: {
      fieldname: String,
      originalname: String,
      encoding: String,
      mimetype: String,
      buffer : Buffer,
      size : Number,

    },
  });

const Admin = mongoose.model('Admin', adminSchema);
const Question = mongoose.model('Question', questionSchema);

const authenticateAdminJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRETADMIN, (err, user) => {
      if (err) {
        console.log(err);
        return res.sendStatus(403);
      }
      req.user = user;
      console.log(user);
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Connect to MongoDB
mongoose.connect("mongodb+srv://mwankhade718:Computer338@cluster0.vakp6gp.mongodb.net/", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'quizApp',
});

app.post('/admin/signup', (req, res) => {
  const { username, password } = req.body;
  function callback(admin) {
    if (admin) {
      res.status(403).json({ message: 'Admin already exists' });
    } else {
      const obj = { username: username, password: password };
      console.log(obj);
      const newAdmin = new Admin(obj);
      newAdmin.save();
      const token = jwt.sign({ username, role: 'admin' }, SECRETADMIN, { expiresIn: '1h' });
      res.json({ message: 'Admin created successfully', token });
    }

  }
  Admin.findOne({ username }).then(callback);
});

  
  app.get('/admin', authenticateAdminJwt, async (req, res) => {
    try {
      const user = await Admin.findOne({ username: req.user.username });
      res.json({ user });
    } catch (error) {
      console.error('Error fetching admin:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.post('/admin/login', async (req, res) => {
    const { username, password } = req.headers;
    try {
      const admin = await Admin.findOne({ username, password});
      if (admin) {
        const token = jwt.sign({ username, role: 'admin' }, SECRETADMIN, { expiresIn: '1h' });
        console.log('logged in successfully');
        res.json({ message: 'Logged in successfully', token });
      } else {
        res.status(403).json({ message: 'Invalid username or password' });
      }
    } catch (error) {
      console.error('Error logging in admin:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  //////////////////////////////////////////////

  app.get('/admin/questions', authenticateAdminJwt, async (req, res) => {
    try {
      // Assuming your Admin model is named Admin and Question model is named Question
      const admin = await Admin.findOne({ username: req.user.username });
      
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }
  
      const adminId = admin._id;
      const questions = await Question.find({ adminId });
  
      if (questions.length > 0) {
        res.status(200).json({ questions });
      } else {
        res.status(404).json({ error: 'No questions found for this admin' });
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/admin/deleteQuestions/:queId', authenticateAdminJwt, async (req, res) => {
    const queId = req.params.queId;
  
    try {
      const result = await Question.findByIdAndDelete(queId);
  
      if (!result) {
        return res.status(404).json({ success: false, message: 'Question not found' });
      }
  
      return res.status(200).json({ success: true, message: 'Question deleted successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  app.get('/admin/getAllQuestions', authenticateAdminJwt, async (req, res) => {
    try {
      const questions = await Question.find();
      res.status(200).json({ success: true, data: questions });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });

// Route to handle form data
app.post('/admin/addQuestion', authenticateAdminJwt,upload.single('imageSolution'), async(req, res) => {
  const user = await Admin.findOne({ username: req.user.username });
  if (req.file) {
    console.log(user._id);
    const imageSolution = req.file;
    const all = Object.keys(req.body).map(key => req.body[key]);
    const options = all[1];
    console.log(options);
    const question = req.body.question;
    
    try {
        
            const newQuestion = new Question({
              
              adminId: user._id,
              question,
              options: options,
              imageSolution,
            });
        
            await newQuestion.save();
        
            res.json({ message: 'Question created successfully', QuestionId: newQuestion.id });
          } catch (error) {
            console.error('Error creating question:', error);
            res.status(500).json({ error: 'Internal Server Error' });
          }
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
