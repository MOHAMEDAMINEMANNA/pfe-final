const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sendPasswordResetEmail=require('../nodemailer')
const path=require('path')
const dotenv=require('dotenv');
const Article=require('../models/Article')
dotenv.config();

// Création d'une structure de données pour stocker les sessions actives
 // Vous pouvez utiliser une base de données ou un cache à la place
 let authenticatedUserIds = [];



const activeSessions = new Map(); // Vous pouvez utiliser une base de données ou un cache à la place
const authenticatesUser = (req, res, next) => {
  try {
    // Vérifier si l'utilisateur est authentifié en vérifiant la présence du token JWT dans les cookies
    const token = req.cookies.jwt;

    if (!token) {
      throw new Error('Authentication required');
    }

    // Vérifier et décoder le token JWT
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // Récupérer l'ID de l'utilisateur à partir du token
    const userId = decodedToken.userId;

    // Vérifier si l'ID de session correspond à l'ID de l'utilisateur
    if (!activeSessions.has(userId)) {
      throw new Error('Invalid session');
    }

    // Passer à l'étape suivante
    next();

  } catch (err) {
    // Renvoyer une réponse d'erreur en cas d'erreur d'authentification
    return res.status(401).json({ message: err.message });
  }
};
const getAuthenticatedData = async (req, res) => {
  try {
    // Récupérer l'ID de l'utilisateur à partir du token JWT
    const token = req.cookies.jwt;
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Rechercher l'utilisateur dans la base de données en utilisant l'ID
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Récupérer la date d'authentification
    
    
    
    // Renvoyer le nom de l'utilisateur et la date d'authentification
    return res.json({
      username: user.name,
      email: user.email,
      enregistrement: user.enregistrement,
      authenticationDate: user.authenticationDate,
      userId

    });
  } catch (error) {
    return res.status(401).json({
      message: 'Authentication failed',
      error: error.message,
    });
  }
};




///////////////////////////////
// Fonction pour obtenir le nom de l'utilisateur authentifié à partir de son ID

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Vérification de l'authentification de l'utilisateur
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const equal = await bcrypt.compare(password, user.password);

    if (!equal) {
      throw new Error('Invalid email or password');
    }


    //tache pour la version 1.1.0

    // Vérification si l'utilisateur a supprimé son compte
    
    // Création du token JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Stockage du token JWT dans un cookie
    res.cookie('jwt', token, { httpOnly: true });

    return res.json({
      message: 'Login successful',
      token: token,
      userId:user._id,
      authenticationDate: user.authenticationDate
    });
  } catch (err) {
    // Renvoyer une réponse d'erreur et arrêt du flux de contrôle avec le mot-clé "return"
    return res.status(401).json({ message: err.message });
  }
};


const deleteUserAccount = async (req, res, next) => {
  try {
    const { userId, email, password } = req.body;

    // Vérification de l'authentification de l'utilisateur
    const user = await User.findOne({ _id: userId, email });

    if (!user) {
      throw new Error('Invalid user credentials');
    }

    const equal = await bcrypt.compare(password, user.password);

    if (!equal) {
      throw new Error('Invalid user credentials');
    }

    // Suppression de l'utilisateur de la base de données
    await User.deleteOne({ _id: userId });

    // Suppression de l'utilisateur de la liste des utilisateurs authentifiés
    authenticatedUserIds = authenticatedUserIds.filter((id) => id !== userId);

    // Suppression de l'ID de session associée à l'ID de l'utilisateur
    // activeSessions.delete(userId); // Commenté car la gestion des sessions a été supprimée

    // Déconnexion automatique de l'utilisateur
    res.clearCookie('jwt');

    return res.json({
      message: 'User account deleted',
      userId: userId
    });
  } catch (err) {
    // Renvoyer une réponse d'erreur et arrêt du flux de contrôle avec le mot-clé "return"
    return res.status(500).json({ message: 'Error deleting user account' });
  }
};





const getUserStats = async (req, res) => {
  
  try {
    // Nombre d'utilisateurs authentifiés
    const authenticatedUserCount = await User.countDocuments({isDeleted:true})

    // Nombre total d'utilisateurs enregistrés
    const totalUserCount = await User.countDocuments();

    res.json({
      authenticatedUserCount,
      totalUserCount,
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};


    

////////////////////////////////

const updateAuthenticatedUserData = async (req, res) => {
  try {
    const { userId, name, email, password, oldEmail, oldPassword } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify the user's old email and password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (user.email !== oldEmail || !isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.name = name;
    user.email = email;
    

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({ message: 'User data updated successfully', user });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update user data' });
  }
};
const afficherUserAuth = (req, res) => {
  try {
    const { name, email } = req.user;
    return res.status(200).json({ name, email });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch user data' });
  }
};
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get user data' });
  }
};













//////////////////////////////////////
const updateUserStatus = async (userId, status) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.isConnected = status === 'Connecté';
    await user.save();
  } catch (error) {
    throw new Error('Error updating user status');
  }
};

const getUsersWithStatus = async (req, res, next) => {
  try {
    const users = await User.find();

    const usersWithStatus = users.map(user => {
      
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        registrationDate: user.registeredAt,
       
      };
    });

    return res.json(usersWithStatus);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to retrieve users' });
  }
};
const logout = async (req, res, next) => {
  try {
    const user = req.user;

    // Suppression du token JWT du cookie
    res.clearCookie('jwt');


    return res.json({
      message: 'Logout successful',
      userId: user._id
    });
  } catch (err) {
    // Renvoyer une réponse d'erreur et arrêt du flux de contrôle avec le mot-clé "return"
    return res.status(500).json({ message: 'An error occurred during logout' });
  }
};






const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    // Vérifie si l'email est déjà utilisé
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    }
    // Hash le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);
    // Crée un nouvel utilisateur
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    // Génère un jeton JWT
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    // Envoie la réponse avec le jeton JWT
        // Envoie la réponse avec le jeton JWT
       
        res.status(201).json({ token });
      } catch (err) {
        next(err);
      }
    };
    //////////////////////////////////////

         // @desc    GET user profile
// @route   GET /api/users/profile
// @access  Private

    //////////////////////////////////////
    const updateUserData = async (req, res) => {
      const userId = req.user.id; // Supposons que l'ID de l'utilisateur authentifié est stocké dans req.user.id
      const { name, email, password } = req.body; // Supposons que les nouvelles valeurs de nom, d'e-mail et de mot de passe sont envoyées dans le corps de la requête
    
      try {
        const user = await User.findByIdAndUpdate(
          userId,
          { name, email, password },
          { new: true }
        );
        res.json(user);
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Une erreur s'est produite lors de la mise à jour des informations utilisateur." });
      }
    };
    
    
    
   
    













const authenticateUser = async (req, res, next) => {
  try {
    // Vérifier si l'utilisateur est authentifié (vous pouvez utiliser votre propre méthode d'authentification ici)
    const isAuthenticated = true; // Votre logique d'authentification ici

    if (!isAuthenticated) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    // L'utilisateur est authentifié, passer à l'étape suivante
    next();
  } catch (error) {
    console.error('Erreur lors de l\'authentification de l\'utilisateur :', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de l\'authentification' });
  }
};
const users = async (req, res) => {
  try {
    // Obtenez la date d'il y a une semaine à partir de la date actuelle
    const currentDate = new Date();
    const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Effectuer la requête pour obtenir les statistiques d'authentification
    const registeredCount = await User.countDocuments();
    const authenticatedCount = await User.countDocuments({ authenticatedAt: { $gte: oneWeekAgo } });

    // Créer un objet contenant les statistiques
    const stats = {
      registeredCount,
      authenticatedCount
    };

    // Envoyer les statistiques en réponse
    res.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques d\'authentification :', error);
    res.status(500).json({ message: 'Une erreur est survenue' });
  }
};



const getAllUsers = async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    res.json({ usersCount });
  } catch (err) {
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération du nombre d\'utilisateurs' });
  }
};


const check = (req, res, next) => {
  // Vérifier si le token est présent dans le cookie
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    
    // Vérifier si le token est valide
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Utilisateur non authentifié' });
  }
};
////////////////////////////////:



const isAuthenticated = (req, res, next) => {
  // Vérifier si le token est présent dans le header de la requête
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    // Vérifier si le token est valide
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decodedToken.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalide' });
  }
};


//////////////////////////////////
const updateProfile = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const userId = req.userData.userId;

    // Vérifie si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Met à jour les données de l'utilisateur
    user.name = name || user.name;
    user.email = email || user.email;
    if (password) {
      user.password = await bcrypt.hash(password, 12);
    }

    // Sauvegarde les modifications
    await user.save();

    res.json({ message: 'Données de l\'utilisateur mises à jour avec succès' });
  } catch (err) {
    next(err);
  }
};







const isLoggedIn = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not logged in' });
  }
  next();
};




const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Génère un code de vérification aléatoire
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    // Enregistre le code de vérification dans le document de l'utilisateur
    user.verificationCode = verificationCode;
    await user.save();
    // Envoie l'e-mail de réinitialisation du mot de passe
    await sendPasswordResetEmail(email, verificationCode);

    res.status(200).json({ message: "E-mail envoyé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
};

const verifyCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verificationCode !== parseInt(code)) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Code is valid
    // Reset the verification code
    user.verificationCode = null;
    await user.save();

    res.status(200).json({ message: "Verification code is valid" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Set new password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};



const wifiData = [
  { nom: 'SpeedyNet', debit: 50, position: 'Centre-ville', utilisateursConnectes: 20 },
  { nom: 'TechConnect', debit: 100, position: 'Quartier des affaires', utilisateursConnectes: 10 },
  { nom: 'HomeSweetWifi', debit: 20, position: 'Banlieue résidentielle', utilisateursConnectes: 5 },
  { nom: 'BeachBreezeNet', debit: 30, position: 'Bord de mer', utilisateursConnectes: 8 },
  { nom: 'CaféWireless', debit: 10, position: 'Café du coin', utilisateursConnectes: 2 },
  { nom: 'ParkWiFiZone', debit: 5, position: 'Parc public', utilisateursConnectes: 0 },
  { nom: 'GamingLoungeNet', debit: 200, position: 'Centre de jeux', utilisateursConnectes: 15 },
  { nom: 'HotelConnect', debit: 50, position: 'Hôtel du centre-ville', utilisateursConnectes: 12 },
  { nom: 'MountainViewWifi', debit: 15, position: 'Station de montagne', utilisateursConnectes: 3 },
  { nom: 'LibraryWireless', debit: 2, position: 'Bibliothèque municipale', utilisateursConnectes: 1 }
];
const graph=(req,res)=>{
  
  res.json(wifiData)
}
const profile = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      throw new Error('Utilisateur non authentifié');
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Récupérer les informations de l'utilisateur à partir de son ID
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Retourner les informations de l'authentification
    const authenticationInfo = {
      userId: user._id,
      name: user.name,
      email: user.email,
      isConnected: user.isConnected
    };

    return res.json(authenticationInfo);
  } catch (err) {
    return res.status(401).json({ message: err.message });
  }
};





const createArticle = async (req, res) => {
  try {
    const { title, content, category } = req.body;

    // Créer un nouvel article avec les données fournies
    const article = new Article({ title, content, category });

    // Enregistrer l'article dans la base de données
    await article.save();

    res.status(200).json({ message: 'Article créé avec succès', article });
  } catch (error) {
    console.error('Erreur lors de la création de l\'article:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'article' });
  }
};




const affiche = async (req, res) => {
  try {
    const { title, content, category } = req.body;

    // Créer un nouvel article avec les données fournies
    const article = new Article({ title, content, category });

    // Enregistrer l'article dans la base de données
    await article.save();

    // Récupérer tous les articles
    const articles = await Article.find();

    res.json({ articles });
  } catch (error) {
    console.error('Erreur lors de la récupération des articles:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des articles' });
  }
};
const getArticle = async (req, res) => {
  try {
    const { articleId } = req.params;

    // Rechercher l'article par son ID
    const article = await Article.findById(articleId);

    if (!article) {
      return res.status(404).json({ error: 'Article introuvable' });
    }

    res.json({ article });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'article:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'article' });
  }
};
// Modifier un article
const updateArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { title, content, category } = req.body;

    // Rechercher l'article par son ID
    const article = await Article.findByIdAndUpdate(articleId, { title, content, category }, { new: true });

    if (!article) {
      return res.status(404).json({ error: 'Article introuvable' });
    }

    res.json({ article });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'article:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'article' });
  }
};

// Supprimer un article
const deleteArticle = async (req, res) => {
  try {
    const { articleId } = req.params;

    // Supprimer l'article par son ID
    const deletedArticle = await Article.findByIdAndDelete(articleId);

    if (!deletedArticle) {
      return res.status(404).json({ error: 'Article introuvable' });
    }

    res.json({ message: 'Article supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'article:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'article' });
  }
};
const switchConfigurations = [
  {
    zone: 'RG',
   
    modèles: [
      {
        modèle: 'SMC 8612XL3',
        ipConfig: '193.168.41.101',
        adresseLoginMP: '192.168.2.199 admin/admin',
        adresseMAC: '0-04-E2-D0-3E-90',
        numéroSérie: 'A444029888'
      },
      {
        modèle: 'SMC 6128 PL',
        ipConfig: '193.168.41.104 ',
        adresseLoginMP: '192.168.2.106 admin/admin',
        adresseMAC: '78-CD-BE-89-3C-20',
        numéroSérie: 'AB11019333'
      },
      {
        modèle: 'HP V1810',
        ipConfig: '193.168.41.102',
        adresseLoginMP: 'MP:vide 192.168.2.10',
        adresseMAC: '88-51-FB-A6-40-80',
        numéroSérie: 'CN33DXYOMW'
      },
      {
        modèle: 'SWITCH EDGE CORE ES4624',
        ipConfig: '193.168.41.100',
        adresseLoginMP: 'MP : vide 192.168.2.254',
        adresseMAC: '70-72-CF-2E-CD-F4',
        numéroSérie: ''
      }
    ]
  },
  //zone2
  {
    zone: 'SRZ1',
    
    modèles: [
      {
        modèle: '3COM 4400 48ports',
        ipConfig: '193.168.41.111',
        adresseLoginMP: '',
        adresseMAC: '00-0A-04-35-10-00',
        numéroSérie: '7NPV187351000'
      }
    ]
  },
  //zone3
  {
    zone: 'SRZ 2',
   
    modèles: [
      {
        modèle: 'SMC 6128 PL2',
        ipConfig: '193.168.41.3',
        adresseLoginMP: 'Ip dhcp router admin/admin',
        adresseMAC: '78-CD-8E-8F-5D-0E',
        numéroSérie: 'AB14015377'
      },
      {
        modèle: 'HP V1810',
        ipConfig: '193.168.41.2',
        adresseLoginMP: '',
        adresseMAC: 'D4-C9-EF-1E-4F-80',
        numéroSérie: 'CN39DXY2X3'
      },
     
    ]
  },
  {
    zone: 'SRZ 3',
    local:"Bureau 106 Dep Géologie",
    modèles: [
      {
        modèle: 'SMC Tiger Stack10/100 SMC6248M Manger',
        ipConfig: '193.168.41.6',
        adresseLoginMP: 'dhcp admin/admin',
        adresseMAC: '00-13-F7-64-A8-C0',
        numéroSérie: 'A650000797'
      }
    ]
  },
  {
    zone: 'SRZ 4',
 
    modèles: [
      {
        modèle: '3 COM 4400',
        ipConfig: '193.168.41.11',
        adresseLoginMP: 'dhcp admin/vide',
        adresseMAC: '00-0A-04-35-11-80',
        numéroSérie: '7NPV187351180'
      },
      {
        modèle: 'HPE office Connect 1920s48G-SFP JL382A',
        ipConfig: '193.168.41.10 ',
        adresseLoginMP: '',
        adresseMAC: '',
        numéroSérie: ''
      },
      
    
    ]
  },
  {
    zone: 'SRZ 5',
    local:"salle de réunnion physique",
    modèles: [
      {
        modèle: 'SMC 6128 PL2',
        ipConfig: '193.168.41.16 admin/fsbSRZx5',
        adresseLoginMP: '192.168.2.100 admin/',
        adresseMAC: '78-CD-8E-95-09-66',
        numéroSérie: 'AB16035030'
      },
      {
        modèle: '3COM 4400',
        ipConfig: '193.168.41.17 admin/fsbSRZx5',
        adresseLoginMP: '192.168.254.105 admin/vide',
        adresseMAC: '00-0A-04-35-17-40',
        numéroSérie: '7NPV187351740'
      },
     
    ]
  },
  {
    zone: 'SRZ 6',
  
    modèles: [
      {
        modèle: 'HP V1810',
        ipConfig: '193.168.41.27',
        adresseLoginMP: '192.168.2.10 admin/vide',
        adresseMAC: '88-51-FB-A5-6B-80',
        numéroSérie: ''
      },
      {
        modèle: '',
        ipConfig: '193.168.41.28 admin',
        adresseLoginMP: '',
        adresseMAC: '78-CD-8E-95-0A-A5',
        numéroSérie: 'AB16035057'
      },
     
    ]
  },
  {
    zone: 'SRZ7',
   
      
        modèles: [
          {
            modèle: '3COM',
            ipConfig: 'Hors service',
            adresseLoginMP: 'Non programmable',
            adresseMAC: '00-D0-96-94-2E-78',
            numéroSérie: '7BV3942E78'
          },
          {
            modèle: 'HP V1810',
            ipConfig: '193.168.41.33',
            adresseLoginMP: 'DHCP',
            adresseMAC: '88-51-FB-A5-9D-40',
            numéroSérie: 'CN33DXY00Y'
          },
          {
            modèle: 'SMC 6128 PL',
            ipConfig: '193.168.41.32',
            adresseLoginMP: '192.168.2.105 admin/admin',
            adresseMAC: '78-CD-8E-95-03-D9',
            numéroSérie: 'AB16034536'
          },
          
       
      //local
     
          {
            modèle: 'D-LINK DGS-1210-28 port',
            ipConfig: '193.168.41.75',
            adresseLoginMP: '10.90.90.90 admin/admin',
            adresseMAC: 'F0-B4-D2-F4-9A-E0',
            numéroSérie: 'TM0H104000056'
          },
        
      
          {
            modèle: '3COM 4228G',
            ipConfig: 'Non administrable',
            adresseLoginMP: 'port 12 SRZ7',
            adresseMAC: '00-12-A9-19-A1-E0',
            numéroSérie: 'LZ1V4UD19A1E0'
          },
          {
            modèle: '3Com 4228G',
            ipConfig: 'Non administrable',
            adresseLoginMP: 'port 13 SRZ7',
            adresseMAC: '00-12-A9-19-CC-60',
            numéroSérie: 'LZ1V4UD19CC60'
          },
       
      
          {
            modèle: 'Switch D-Link DES-3225G',
            ipConfig: '193.168.41.205',
            adresseLoginMP: 'Port B/5 Brassage',
            adresseMAC: '',
            numéroSérie: ''
          },
         
        
      // ... Ajoutez les autres locaux avec leurs modèles ici
    ]
  },
  {
    zone: 'SRZ 8',
  
    modèles: [
      {
        modèle: 'SMC 6128 PL',
        ipConfig: '193.168.41.42',
        adresseLoginMP: '192.168.2.102 admin/admin',
        adresseMAC: '78-CD-8E-89-3C-A0',
        numéroSérie: 'AB11019380'
      },
      {
        modèle: '3COM 4400',
        ipConfig: '193.168.41.43',
        adresseLoginMP: '192.168.254.37 admin/',
        adresseMAC: '00-0A-04-35-0D-80',
        numéroSérie: '7NPV187350D80'
      },
     
    ]
  },
  {
    zone: 'SRZ 9',
    
    modèles: [
      {
        modèle: '3COM 4400 24 port 3C17203',
        ipConfig: '',
        adresseLoginMP: '',
        adresseMAC: '00-0A-04-30-12-C0',
        numéroSérie: '7PVV1973012C0'
      },
   
     
    ]
  },
  {
    zone: 'SRZ 10',
   
        
        modèles: [
          {
            modèle: 'SMC 6128 PL',
            ipConfig: '193.168.41.51',
            adresseLoginMP: 'admin/admin 192.168.2.X',
            adresseMAC: '78-CD-8E-89-54-20',
            numéroSérie: 'AB11019301'
          },
          {
            modèle: 'SMC 6128 PL',
            ipConfig: '193.168.41.52',
            adresseLoginMP: '',
            adresseMAC: '00-0A-04-35-14-40',
            numéroSérie: '7NPV187351440'
          },
        
          
          
       
      //local
      
          {
            modèle: '3COM 4400',
            ipConfig: '193.168.41.53',
            adresseLoginMP: '',
            adresseMAC: '00-05-1A-AB-C4-80',
            numéroSérie: '7PVV0Q6ABC480'
          }
       
      
     
      // ... Ajoutez les autres locaux avec leurs modèles ici
    ]
  },
  {
    zone: 'switch config SRZ 11',
    
        
        modèles: [
          {
            modèle: '3COM 4400',
            ipConfig: '193.168.41.56',
            adresseLoginMP: '',
            adresseMAC: '00-0A-04-34-E4-40',
            numéroSérie: '7NPV18734E400'
          },
          {
            modèle: 'SMC 6128 PL',
            ipConfig: '193.168.41.57 admin',
            adresseLoginMP: 'admin/admin 192.168.2.104',
            adresseMAC: '78-CD-8E-89-65-E0',
            numéroSérie: 'AB11019354'
          },
          {
            modèle: 'SMC 6128 PL',
            ipConfig: '193.168.41.58',
            adresseLoginMP: '192.168.2.103 admin/admin',
            adresseMAC: '78-CD-8E-95-14-46',
            numéroSérie: 'AB16038137'
          },
          {
            modèle: '3COM 4400',
            ipConfig: '193.168.41.59',
            adresseLoginMP: '',
            adresseMAC: '00-0A-04-34-03-40',
            numéroSérie: '7NPV187340300'
          },
          {
            modèle: 'HPE OfficeConnect 1920S 48G 4SFP JL382A',
            ipConfig: '193.168.41.60',
            adresseLoginMP: 'DHCP admin/vide',
            adresseMAC: '80-30-E0-6C-72-E0',
            numéroSérie: 'CN89GMW4KN'
          },
          
        
      //local
      
          {
            modèle: 'HPE 1820 24G J9980A',
            ipConfig: '193.168.41.61',
            adresseLoginMP: 'DHCP admin/vide',
            adresseMAC: 'B8-83-03-CF-47-80',
            numéroSérie: 'CN89GMW3PR'
          },
       
      
          {
            modèle: 'HPE 1820 24G J9980A',
            ipConfig: '193.168.41.62',
            adresseLoginMP: 'DHCP admin/vide',
            adresseMAC: '80-30-E0-6C-72-E0',
            numéroSérie: 'CN89GMW4KN'
          },
          
      
      
          {
            modèle: 'D-Link DGS-1210-28port',
            ipConfig: '193.168.41.63',
            adresseLoginMP: '10.90.90.90 admin/admin',
            adresseMAC: 'F0-B4-D2-F4-A2-30',
            numéroSérie: 'TM0H104000060'
          },
         
       
     
          {
            modèle: 'D-Link DGS-1210-28port',
            ipConfig: '193.168.41.64',
            adresseLoginMP: '10.90.90.90 admin/admin',
            adresseMAC: 'F0-B4-D2-F4-A1-D0',
            numéroSérie: 'TM0H104000059'
          },
         
       
    
          {
            modèle: 'D-Link DGS-1210-28port',
            ipConfig: '193.168.41.65',
            adresseLoginMP: '10.90.90.90 admin/admin',
            adresseMAC: 'F0-B4-D2-F4-9A-80',
            numéroSérie: 'TM0H104000058'
          },
         
       
      
          {
            modèle: 'D-Link DGS-1024D 24p',
            ipConfig: 'Non administrable',
            adresseLoginMP: 'Non administrable',
            adresseMAC: '',
            numéroSérie: 'SY411J000328'
          },
        
      
          {
            modèle: 'D-Link DGS-1024D 24p',
            ipConfig: 'Non administrable',
            adresseLoginMP: 'Non administrable',
            adresseMAC: '',
            numéroSérie: 'SY411J001581'
          },
         
        
     
          {
            modèle: 'Switch D-Link DES-1210-28',
            ipConfig: '193.168.41. 70',
            adresseLoginMP: '10.90.90.90 admin/admin',
            adresseMAC: '6C-72-20-AD-A1-64',
            numéroSérie: 'F3XZ4F8000999'
          },
         
      
      // ... Ajoutez les autres locaux avec leurs modèles ici
    ]
  },
  

  
  
];const afficheZones3 = (req, res) => {
  const models = [];

  switchConfigurations.forEach(zoneModels => {
    const zoneModelsList = zoneModels.modèles || [];
    zoneModelsList.forEach(modèle => {
      const updatedModel = { ...modèle, zone: zoneModels.zone };
      models.push(updatedModel);
    });
  });

  res.send(models);
};
const afficherInformationsSwitches = (req, res) => {
  // Calcul du nombre total de modèles
  const nombreModeles = switchConfigurations.reduce(
    (acc, zone) => acc + zone.modèles.length,
    0
  );

  // Calcul du nombre de zones
  const nombreZones = switchConfigurations.length;

  // Création d'un tableau pour stocker les informations par zone
  const informationsZones = [];

  // Parcours des configurations de switches
  switchConfigurations.forEach((zone) => {
    const nombreModelesZone = zone.modèles.length;
    const nomZone = zone.zone;

    // Ajout des informations de la zone au tableau
    informationsZones.push({
      zone: nomZone,
      nombreModeles: nombreModelesZone,
      modèles: zone.modèles,
    });
  });

  // Affichage des informations
  res.json({
    nombreModeles,
    nombreZones,
    informationsZones,
  });
};















const generateData = (req,res) => {
  const data = [];
  for (let i = 0; i < 24; i++) {
    let hour = i % 24; // Réduit l'heure à une valeur entre 0 et 23
    let debit;

    if (hour === 6) {
      debit = 90; // Débit de 90 Mbps à 6:00
    } else if (hour === 7) {
      debit = 80; // Débit de 80 Mbps à 7:00
    } else if (hour === 8) {
      debit = 73; // Débit de 73 Mbps à 8:00
    } else if (hour === 9) {
      debit = 52; // Débit de 52 Mbps à 9:00
    } else if (hour === 10) {
      debit = 32; // Débit de 32 Mbps à 10:00
    } else if (hour === 11) {
      debit = 29; // Débit de 29 Mbps à 11:00
    } else if (hour === 12) {
      debit = 26; // Débit de 26 Mbps à 12:00
    } else if (hour === 13) {
      debit = 18; // Débit de 18 Mbps à 13:00
    } else if (hour === 14) {
      debit = 10; // Débit de 10 Mbps à 14:00
    } else if (hour === 15) {
      debit = 8; // Débit de 8 Mbps à 15:00
    } else if (hour === 16) {
      debit = 25; // Débit de 49 Mbps à 16:00
    } else if (hour === 17) {
      debit = 59; // Débit de 59 Mbps à 17:00
    } else if (hour === 18) {
      debit = 89; // Débit de 89 Mbps à 18:00
    } else if (hour === 19) {
      debit = 93; // Débit de 93 Mbps à 19:00
    } else if (hour === 20) {
      debit = 81; // Débit de 81 Mbps à 20:00
    } else if (hour === 21) {
      debit = 94; // Débit de 94 Mbps à 21:00
    } else if (hour === 22) {
      debit = 100; // Débit de 100 Mbps à 22:00
    } else if (hour === 23) {
      debit = 91; // Débit de 91 Mbps à 23:00
    } else if (hour === 0) {
      debit = 96; // Débit de 96 Mbps à 00:00
    } else if (hour === 1) {
      debit = 98; // Débit de 98 Mbps à 01:00
    } else if (hour === 2) {
      debit = 89; // Débit de 89 Mbps à 02:00
    } else if (hour === 3) {
      debit = 84; // Débit de 84 Mbps à 03:00
    } else if (hour === 4) {
      debit = 80; // Débit de 80 Mbps à 04:00
    } else if (hour === 5) {
      debit = 85; // Débit de 85 Mbps à 05:00
    } else if (hour === 23 && i === 23) {
      debit = 88; // Débit de 88 Mbps à 05:59
    } else {
      debit = Math.floor(Math.random() * 91) + 10; // Débit très fort (entre 10 et 100 Mbps)
    }

    data.push({ time: `${hour}:00`, debit });
  }
  return res.json(data);
};

const generateData1 = (req,res) => {
  const data = [];
  for (let i = 0; i < 24; i++) {
    let hour = i % 24; // Réduit l'heure à une valeur entre 0 et 23
    let debit;

    if (hour === 6) {
      debit = 88; // Débit de 90 Mbps à 6:00
    } else if (hour === 7) {
      debit = 78; // Débit de 80 Mbps à 7:00
    } else if (hour === 8) {
      debit = 68; // Débit de 73 Mbps à 8:00
    } else if (hour === 9) {
      debit = 50; // Débit de 52 Mbps à 9:00
    } else if (hour === 10) {
      debit = 30; // Débit de 32 Mbps à 10:00
    } else if (hour === 11) {
      debit = 26; // Débit de 29 Mbps à 11:00
    } else if (hour === 12) {
      debit = 22; // Débit de 26 Mbps à 12:00
    } else if (hour === 13) {
      debit = 16; // Débit de 18 Mbps à 13:00
    } else if (hour === 14) {
      debit = 11; // Débit de 10 Mbps à 14:00
    } else if (hour === 15) {
      debit = 9; // Débit de 8 Mbps à 15:00
    } else if (hour === 16) {
      debit = 19; // Débit de 49 Mbps à 16:00
    } else if (hour === 17) {
      debit = 56; // Débit de 59 Mbps à 17:00
    } else if (hour === 18) {
      debit = 80; // Débit de 89 Mbps à 18:00
    } else if (hour === 19) {
      debit = 90; // Débit de 93 Mbps à 19:00
    } else if (hour === 20) {
      debit = 87; // Débit de 81 Mbps à 20:00
    } else if (hour === 21) {
      debit = 96; // Débit de 94 Mbps à 21:00
    } else if (hour === 22) {
      debit = 99; // Débit de 100 Mbps à 22:00
    } else if (hour === 23) {
      debit = 92; // Débit de 91 Mbps à 23:00
    } else if (hour === 0) {
      debit = 97; // Débit de 96 Mbps à 00:00
    } else if (hour === 1) {
      debit = 99; // Débit de 98 Mbps à 01:00
    } else if (hour === 2) {
      debit = 84; // Débit de 89 Mbps à 02:00
    } else if (hour === 3) {
      debit = 89; // Débit de 84 Mbps à 03:00
    } else if (hour === 4) {
      debit = 80; // Débit de 80 Mbps à 04:00
    } else if (hour === 5) {
      debit = 85.5; // Débit de 85 Mbps à 05:00
    } else if (hour === 23 && i === 23) {
      debit = 87; // Débit de 88 Mbps à 05:59
    } else {
      debit = Math.floor(Math.random() * 91) + 10; // Débit très fort (entre 10 et 100 Mbps)
    }

    data.push({ time: `${hour}:00`, debit });
  }
  return res.json(data);
};
const generateData2= (req,res) => {
  const data = [];
  for (let i = 0; i < 24; i++) {
    let hour = i % 24; // Réduit l'heure à une valeur entre 0 et 23
    let debit;

    if (hour === 6) {
      debit = 89; // Débit de 90 Mbps à 6:00
    } else if (hour === 7) {
      debit = 82; // Débit de 80 Mbps à 7:00
    } else if (hour === 8) {
      debit = 70; // Débit de 73 Mbps à 8:00
    } else if (hour === 9) {
      debit = 53; // Débit de 52 Mbps à 9:00
    } else if (hour === 10) {
      debit = 34; // Débit de 32 Mbps à 10:00
    } else if (hour === 11) {
      debit = 22; // Débit de 29 Mbps à 11:00
    } else if (hour === 12) {
      debit = 42; // Débit de 26 Mbps à 12:00
    } else if (hour === 13) {
      debit = 19; // Débit de 18 Mbps à 13:00
    } else if (hour === 14) {
      debit = 10; // Débit de 10 Mbps à 14:00
    } else if (hour === 15) {
      debit = 9; // Débit de 8 Mbps à 15:00
    } else if (hour === 16) {
      debit = 18; // Débit de 49 Mbps à 16:00
    } else if (hour === 17) {
      debit = 59; // Débit de 59 Mbps à 17:00
    } else if (hour === 18) {
      debit = 82; // Débit de 89 Mbps à 18:00
    } else if (hour === 19) {
      debit = 91; // Débit de 93 Mbps à 19:00
    } else if (hour === 20) {
      debit = 88; // Débit de 81 Mbps à 20:00
    } else if (hour === 21) {
      debit = 93; // Débit de 94 Mbps à 21:00
    } else if (hour === 22) {
      debit = 100; // Débit de 100 Mbps à 22:00
    } else if (hour === 23) {
      debit = 91; // Débit de 91 Mbps à 23:00
    } else if (hour === 0) {
      debit = 93; // Débit de 96 Mbps à 00:00
    } else if (hour === 1) {
      debit = 98; // Débit de 98 Mbps à 01:00
    } else if (hour === 2) {
      debit = 86; // Débit de 89 Mbps à 02:00
    } else if (hour === 3) {
      debit = 94; // Débit de 84 Mbps à 03:00
    } else if (hour === 4) {
      debit = 89; // Débit de 80 Mbps à 04:00
    } else if (hour === 5) {
      debit = 99; // Débit de 85 Mbps à 05:00
    } else if (hour === 23 && i === 23) {
      debit = 100; // Débit de 88 Mbps à 05:59
    } else {
      debit = Math.floor(Math.random() * 91) + 10; // Débit très fort (entre 10 et 100 Mbps)
    }

    data.push({ time: `${hour}:00`, debit });
  }
  return res.json(data);
};
const generateData3= (req,res) => {
  const data = [];
  for (let i = 0; i < 24; i++) {
    let hour = i % 24; // Réduit l'heure à une valeur entre 0 et 23
    let debit;

    if (hour === 6) {
      debit = 81; // Débit de 90 Mbps à 6:00
    } else if (hour === 7) {
      debit = 79; // Débit de 80 Mbps à 7:00
    } else if (hour === 8) {
      debit = 68; // Débit de 73 Mbps à 8:00
    } else if (hour === 9) {
      debit = 53; // Débit de 52 Mbps à 9:00
    } else if (hour === 10) {
      debit = 34; // Débit de 32 Mbps à 10:00
    } else if (hour === 11) {
      debit = 22; // Débit de 29 Mbps à 11:00
    } else if (hour === 12) {
      debit = 42; // Débit de 26 Mbps à 12:00
    } else if (hour === 13) {
      debit = 19; // Débit de 18 Mbps à 13:00
    } else if (hour === 14) {
      debit = 10; // Débit de 10 Mbps à 14:00
    } else if (hour === 15) {
      debit = 9; // Débit de 8 Mbps à 15:00
    } else if (hour === 16) {
      debit = 18; // Débit de 49 Mbps à 16:00
    } else if (hour === 17) {
      debit = 59; // Débit de 59 Mbps à 17:00
    } else if (hour === 18) {
      debit = 82; // Débit de 89 Mbps à 18:00
    } else if (hour === 19) {
      debit = 91; // Débit de 93 Mbps à 19:00
    } else if (hour === 20) {
      debit = 88; // Débit de 81 Mbps à 20:00
    } else if (hour === 21) {
      debit = 93; // Débit de 94 Mbps à 21:00
    } else if (hour === 22) {
      debit = 100; // Débit de 100 Mbps à 22:00
    } else if (hour === 23) {
      debit = 91; // Débit de 91 Mbps à 23:00
    } else if (hour === 0) {
      debit = 93; // Débit de 96 Mbps à 00:00
    } else if (hour === 1) {
      debit = 98; // Débit de 98 Mbps à 01:00
    } else if (hour === 2) {
      debit = 86; // Débit de 89 Mbps à 02:00
    } else if (hour === 3) {
      debit = 94; // Débit de 84 Mbps à 03:00
    } else if (hour === 4) {
      debit = 89; // Débit de 80 Mbps à 04:00
    } else if (hour === 5) {
      debit = 99; // Débit de 85 Mbps à 05:00
    } else if (hour === 23 && i === 23) {
      debit = 91; // Débit de 88 Mbps à 05:59
    } else {
      debit = Math.floor(Math.random() * 91) + 10; // Débit très fort (entre 10 et 100 Mbps)
    }

    data.push({ time: `${hour}:00`, debit });
  }
  return res.json(data);
};
const users1=async (req, res) => {
  try {
    // Obtenir la date actuelle
    const currentDate = new Date();

    // Obtenir l'année, le mois et le jour de la date actuelle
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // Notez que les mois sont indexés à partir de 0
    const day = currentDate.getDate();

    // Effectuer la requête pour obtenir le nombre d'utilisateurs authentifiés pour la date actuelle
    const authenticatedCount = await User.countDocuments({ authenticatedAt: { $gte: new Date(year, month - 1, day) } });

    // Créer un objet contenant l'année, le mois, le jour et le nombre d'utilisateurs authentifiés
    const result = { year, month, day, authenticatedCount };

    res.json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre d\'utilisateurs authentifiés :', error);
    res.status(500).json({ message: 'Une erreur est survenue' });
  }
}
const authenticateUser2= async (req, res, next) => {
  try {
    // Vérifier si l'utilisateur est authentifié (vous pouvez utiliser votre propre méthode d'authentification ici)
    const isAuthenticated = true; // Votre logique d'authentification ici

    if (!isAuthenticated) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    // L'utilisateur est authentifié, passer à l'étape suivante
    next();
  } catch (error) {
    console.error('Erreur lors de l\'authentification de l\'utilisateur :', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de l\'authentification' });
  }
};
const getNumberOfRegisteredUsers = async (req,res) => {
  try {
    const registeredUsersCount = await User.countDocuments();
    res.json(registeredUsersCount)
  } catch (error) {
    console.error("Erreur lors de la récupération du nombre d'utilisateurs enregistrés :", error);
  }
};

const getNumberOfAuthenticatedUsers = (req, res) => {
  try {
    const authenticatedUsersCount = authenticatedUserIds.length;
    res.json({ count: authenticatedUsersCount });
  } catch (error) {
    console.error("Erreur lors de la récupération du nombre d'utilisateurs authentifiés :", error);
    res.status(500).json({ error: "Une erreur s'est produite lors de la récupération du nombre d'utilisateurs authentifiés" });
  }
};
module.exports = { login,getNumberOfAuthenticatedUsers,deleteUserAccount,getUserStats,getNumberOfRegisteredUsers,graph,generateData,users1,afficherInformationsSwitches,authenticateUser2,generateData1,generateData2,generateData3,afficherUserAuth,getUserById,getAuthenticatedData,authenticatesUser,getAllUsers,updateAuthenticatedUserData,isAuthenticated,updateUserData,affiche,afficheZones3,getArticle,deleteArticle,updateArticle,profile,getUsersWithStatus,createArticle,updateUserStatus,users,authenticateUser, register,logout,isLoggedIn ,check,updateProfile,forgotPassword,resetPassword,verifyCode};
