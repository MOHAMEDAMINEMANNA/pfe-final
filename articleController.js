const Article = require("../models/Article");
const User=require('../models/User')
const moment=require('moment')
// Contrôleur pour la création d'un nouvel article
const createArticle = async (req, res) => {
  try {
    const { userId, title, content } = req.body;

    // Récupérer l'ID de l'utilisateur depuis la requête
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newArticle = new Article({
      title,
      content,
      user: userId, // Assigner l'ID de l'utilisateur à la propriété "user" de l'article
      createdAt: new Date(), // Ajouter la date de création de l'article
    });

    const savedArticle = await newArticle.save();

    // Récupérer le nom de l'utilisateur correspondant à partir de son ID
    const username = user.name;

    // Envoyer une notification aux autres utilisateurs pour informer l'ajout de l'article
    

    res.status(201).json({
      article: savedArticle,
      username,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// Contrôleur pour la mise à jour d'un article existant
const updateArticle = async (req, res) => {
  try {
    const articleId = req.params.id;
    const updatedData = req.body;

    const article = await Article.findById(articleId);

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    article.title = updatedData.title;
    article.content = updatedData.content;
  

    const updatedArticle = await article.save();

    res.status(200).json({ message: "Article updated successfully", article: updatedArticle });
  } catch (error) {
    res.status(500).json({ error: "Failed to update article" });
  }
};


  



// Contrôleur pour la suppression d'un article existant
const deleteArticle = async (req, res) => {
  try {
    const {id} = req.params;
    const {userId} = req.body;
    
    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    
    if (article.user.toString() !== userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const deletedArticle = await Article.findByIdAndRemove(id);

    res.json({ message: "Article deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
}
const get = async (req, res) => {
  try {
    const articles = await Article.find()
      .populate('user', 'name')
      .select('title createdAt')
      .lean(); // Utiliser la méthode lean() pour récupérer des objets JavaScript simples

    res.json(articles);
  } catch (error) {
    console.error("Error getting articles:", error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};
const getArticleCountByAuthor = async (req, res) => {
  try {
    const articleCounts = await Article.aggregate([
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'author'
        }
      },
      {
        $project: {
          author: { $arrayElemAt: ['$author', 0] },
          count: 1
        }
      },
      {
        $project: {
          authorName: '$author.name',
          count: 1
        }
      }
    ]);

    res.json(articleCounts);
  } catch (error) {
    console.error('Error getting article counts by author:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};





// Contrôleur pour la récupération de tous les articles
const getArticles = async (req, res) => {
  try {
    const articles = await Article.find().populate('user', 'name');
    const formattedArticles = articles.map(article => {
      return {
        _id: article._id,
        title: article.title,
        content: article.content,
        username: article.user ? article.user.name : '', // Inclure le nom de l'utilisateur s'il existe
        // Ajouter la date de création de l'article
      };
    });
    res.json(formattedArticles);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

/*const affich=async(req,res)=>{
  try {
    const articles = await Article.find();
   
    res.json(articles); // Envoie les articles au format JSON en réponse à la requête
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}*/
/*const affich = async (req, res) => {
  try {
    const articles = await Article.find().populate('user', 'name');
   
    const articleData = articles.map((article) => ({
      id: article._id,
      title: article.title,
      content: article.content,
      createdAt: article.createdAt,
      createdBy: article.user ? article.user.name : 'Unknown User',
    }));

    res.json(articleData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};*/
const affich = async (req,res) => {
  try {
    const totalArticles = await Article.countDocuments();
    const deletedArticles = await Article.countDocuments({ deleted: true });
    const modifiedArticles = await Article.countDocuments({ modified: true });
    
    res.json( totalArticles)
    res.json( deletedArticles)
     
     
    
  } catch (error) {
    console.error("Error getting number of articles:", error);
    throw new Error("Failed to get number of articles");
  }
};



  
  
  
  
  


////////////////////////////////////////////////////////:



// Fonction pour récupérer le nombre d'utilisateurs créés


// Fonction pour récupérer le nombre d'utilisateurs modifiés

const getArticlesWithCreatedAt = async (req,res) => {
  try {
    const articles = await Article.find().select("title createdAt");
    res.json(articles);
  } catch (error) {
    console.error("Error getting articles with createdAt:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
/////////////////////////////////////////////////////////
const getNumberOfArticles = async (req, res) => {
    try {
      const count = await Article.countDocuments();
      res.json({ numberOfArticles: count });
    } catch (error) {
      console.error("Error getting number of articles:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { getArticles,get,getArticleCountByAuthor,affich,createArticle,getArticlesWithCreatedAt, updateArticle, deleteArticle,getNumberOfArticles };