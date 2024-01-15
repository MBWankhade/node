const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');

const app = express();
const port = 3000;
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
    buffer: Buffer,
    size: Number,
  },
  date: {
    type: Date,
    default: () => Date(),
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
    const admin = await Admin.findOne({ username, password });
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

app.delete('/admin/deleteQuestions/:questionId', authenticateAdminJwt, async (req, res) => {
  const questionId = req.params.questionId;

  try {
    const result = await Question.findByIdAndDelete(questionId);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    return res.status(200).json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});







app.get('/admin/getAllAdmins', async (req, res) => {
  try {
    const admins = await Admin.find();
    res.status(200).json({ success: true, data: admins });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

//alldates
app.get('/admin/getAllDates', async (req, res) => {
  try {
    const dates = await Question.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        },
      },
      { $sort: { "_id": 1 } },
    ]);
    console.log(dates);

    // Format dates to Indian Standard Time (IST) without using libraries
    const formattedDates = dates.map(dateObj => {
      const utcDate = new Date(dateObj._id);
      const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000); // Add 5.5 hours for IST
      const formattedDate = istDate.toISOString().split('T')[0];
      return formattedDate;
    });

    console.log(formattedDates);
    res.status(200).json({ success: true, data: formattedDates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


app.get('/admin/getDates/:adminId', async (req, res) => {
  const adminId = req.params.adminId;

  try {
    const dates = await Question.aggregate([
      { $match: { adminId: adminId } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        },
      },
      { $sort: { "_id": 1 } },
    ]);

    // Format dates to Indian Standard Time (IST) without using libraries
    const formattedDates = dates.map(dateObj => {
      const utcDate = new Date(dateObj._id);
      const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000); // Add 5.5 hours for IST
      const formattedDate = istDate.toISOString().split('T')[0];
      return formattedDate;
    });

    console.log(formattedDates);
    res.status(200).json({ success: true, data: formattedDates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});



// Route to handle form data
app.post('/admin/addQuestion', authenticateAdminJwt, upload.single('imageSolution'), async (req, res) => {
  const user = await Admin.findOne({ username: req.user.username });
  console.log(moment.tz('Asia/Kolkata').toDate())

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
  } else {
    // If imageSolution is not provided
    console.log(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const all = Object.keys(req.body).map(key => req.body[key]);
    const options = all[1];
    const question = req.body.question;

    try {
      const newQuestion = new Question({
        adminId: user._id,
        question,
        options: options,
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

app.get('/admin/getAllQuestions', authenticateAdminJwt, async (req, res) => {
  const { adminId, date } = req.query;

  try {
    const admin = await Admin.findOne({ _id: adminId, });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    let query = { adminId: admin._id };

    if (date) {
      // If date is provided, convert it from IST to UTC and create a date range for the entire day in UTC
      const startOfDayIST = new Date(date);
      const endOfDayIST = new Date(startOfDayIST);
    
      // Convert to UTC (subtract 5 hours and 30 minutes)
      startOfDayIST.setHours(startOfDayIST.getHours() - 5, startOfDayIST.getMinutes() - 30);
      endOfDayIST.setHours(23, 59, 59, 999);
      endOfDayIST.setHours(endOfDayIST.getHours() - 5, endOfDayIST.getMinutes() - 30);
    
      // Query date range in UTC
      const startOfDayUTC = startOfDayIST.toISOString();
      const endOfDayUTC = endOfDayIST.toISOString();
      console.log(date);
      query.date = { $gte: startOfDayUTC, $lte: endOfDayUTC };
    }
    
    console.log(query);
    const questions = await Question.find(query);

    if (questions.length > 0) {
      res.status(200).json({ success: true, data: questions });
    } else {
      res.status(404).json({ success: false, error: 'No questions found for this admin and date' });
    }
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});