const User = require('../models/User');
const Evaluation = require('../models/Evaluation');
const Message = require('../models/message');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const { extractRawText } = require('mammoth');






const addEvaluation = async (req, res) => {
  try {
    const { userId, rating, comment } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Vérifier si une évaluation existe déjà pour cet utilisateur
    const existingEvaluation = await Evaluation.findOne({ userId });

    if (existingEvaluation) {
      // Mettre à jour l'évaluation existante
      existingEvaluation.rating = rating;
      existingEvaluation.comment = comment;
      existingEvaluation.createdAt = new Date();

      // Enregistrer les modifications dans la base de données
      const updatedEvaluation = await existingEvaluation.save();

      return res.status(200).json({
        evaluation: updatedEvaluation,
        message: 'Evaluation updated successfully',
      });
    }

    // Créer une nouvelle évaluation
    const newEvaluation = new Evaluation({
      userId,
      rating,
      comment,
      createdAt: new Date(),
    });

    // Enregistrer la nouvelle évaluation dans la base de données
    const savedEvaluation = await newEvaluation.save();

    res.status(201).json({
      evaluation: savedEvaluation,
      message: 'Evaluation added successfully',
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};
const getEvaluations = async (req, res) => {
    try {
      // Récupérer toutes les évaluations avec les informations de l'utilisateur
      const evaluations = await Evaluation.find().populate('userId');
  
      // Mapper les évaluations pour inclure le nom de l'utilisateur
      const evaluationsWithUser = evaluations.map((evaluation) => ({
        _id: evaluation._id,
        userId: evaluation.userId._id,
        userName: evaluation.userId.name,
        rating: evaluation.rating,
        comment: evaluation.comment,
        createdAt: evaluation.createdAt,
      }));
  
      res.status(200).json({ evaluations: evaluationsWithUser });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Something went wrong' });
    }
  };
  const sendMessage = async (req, res) => {
    try {
      const { senderId, receiverEmail, message } = req.body;
  
      // Vérifier si les utilisateurs existent
      const sender = await User.findById(senderId);
      const receiver = await User.findOne({ email: receiverEmail });
  
      if (!sender || !receiver) {
        return res.status(404).json({ message: 'Sender or receiver not found' });
      }
  
      // Vérifier si le sender est différent du receiver
      if (sender._id.equals(receiver._id)) {
        return res.status(400).json({ message: "Sender cannot send a message to themselves" });
      }
  
      // Créer un nouveau message
      const newMessage = new Message({
        sender: sender._id,
        receiver: receiver._id,
        message,
        createdAt: new Date(),
      });
  
      // Enregistrer le message dans la base de données
      const savedMessage = await newMessage.save();
  
      res.status(201).json({
        message: savedMessage,
        success: 'Message sent successfully',
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Something went wrong' });
    }
  };
  
  const getReceivedMessages = async (req, res) => {
    try {
      const receiverId = req.params.receiverId;
  
      // Vérifier si l'utilisateur existe
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        return res.status(404).json({ message: 'Receiver not found' });
      }
  
      // Récupérer les messages reçus par l'utilisateur
      const receivedMessages = await Message.find({ receiver: receiverId })
        .populate('sender', 'email')
        .select('message createdAt');
  
      res.status(200).json(receivedMessages);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Something went wrong' });
    }
  };
  
  const convertWordToPDF = async (req, res) => {
    try {
      const { inputFilePath, outputFilePath } = req.body;
  
      // Lecture du fichier Word
      const wordData = fs.readFileSync(inputFilePath);
      
      // Extraction du texte brut à partir du fichier Word
      const rawText = extractRawText(wordData);
  
      // Création d'un nouveau document PDF
      const pdfDoc = PDFDocument.create();
  
      // Ajout du texte extrait au document PDF
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const textWidth = width - 50;
      const textHeight = height - 50;
      const fontSize = 12;
      const lines = rawText.split('\n');
          
      let y = textHeight;
      for (const line of lines) {
        const text = page.drawText(line, { x: 25, y, size: fontSize });
        y -= fontSize + 5;
        if (y < 50) {
          // Nouvelle page si le texte dépasse la hauteur disponible
          page = pdfDoc.addPage();
          y = textHeight;
        }
      }
  
      // Enregistrement du document PDF
      const pdfBytes = await pdfDoc.save();
  
      // Écriture du fichier PDF
      fs.writeFileSync(outputFilePath, pdfBytes);
  
      console.log('Conversion successful!');
      res.json({ message: 'Conversion successful!' });
    } catch (error) {
      console.error('Conversion failed:', error);
      res.status(500).json({ message: 'Conversion failed', error });
    }
  };
  /////////////////////:
  let salles = [];

// Ajouter une salle
 const ajouteSalle=async(nom, etat)=> {
  try {
    // Créer une nouvelle instance de la salle
    const nouvelleSalle = new Salle({
      nom: nom,
      etat: etat
    });

    // Enregistrer la nouvelle salle dans la base de données
    const salleEnregistree = await nouvelleSalle.save();

    return salleEnregistree;
  } catch (error) {
    throw new Error('Erreur lors de l\'ajout de la salle : ' + error.message);
  }
}

  
  
  module.exports = { getEvaluations ,addEvaluation,convertWordToPDF,sendMessage,getReceivedMessages};


