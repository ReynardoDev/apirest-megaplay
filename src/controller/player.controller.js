import { pool } from "../db.js";



export const getPlayers = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM players");
    res.json(rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Players not found - db error"
    });
  }
}


export const getPlayerById = async (req, res) => {  
  const { id } = req.params;
  try {  
    const [rows] = await pool.query("SELECT id_player, user, email FROM players WHERE id_player = ? AND active = 1", [id]);
    if (rows.length <= 0) {
      return res.status(404).json({ 
        message: "Player not found"
      });
    }
    res.json(rows[0]);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Player not found - db error"
    });
  }
};


export const deletePlayerById = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM players WHERE id_player = ?", [id]);
    if (result.affectedRows <= 0) {
      return res.status(404).json({ 
        message: "Player not found"
      });
    }
    res.json({ message: "Player " + id + " deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Player not found - db error"
    });
  }
};

export const changeActivePlayer = async (req, res) => {
  const [id] = req.params.id;    
  const [active] = req.params.active;
  try {  
    const [result] = await pool.query("UPDATE players SET active = ? WHERE id_player = ?", [active, id]);
    if (result.affectedRows <= 0) {
      return res.status(404).json({ 
        message: "Player " + id + " not found"  
      });
    }
    res.json({
         message: "Player: " + id + " active: " + active         
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Player not found - db error"
    });
  }
};


export const getWalletById = async (req, res) => {
  const { id } = req.params;
  try {  
    const [rows] = await pool.query("SELECT chips FROM wallet WHERE id_player = ?", [id]);
    if (rows.length <= 0) {
      return res.status(404).json({ 
        message: "Wallet not found"
      });
    }
    res.json(rows[0]);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Wallet not found - db error"
    });
  }
};


//Update 
export const updatePlayer = async (req, res) => {
  const {id} = req.params;
  const {user, password, email, active} = req.body;
  try {    
    const [result] = await pool.query("UPDATE players SET user = IFNULL(?, user), password = IFNULL(?, password), email = IFNULL(?, email), active = IFNULL(?, active) WHERE id_player = ?", [user, password, email, active, id]);
    if (result.affectedRows <= 0) {
      return res.status(404).json({ 
        message: "Player " + id + " not found"  
      });
    }
    res.json({
         message: "Player: " + id + " updated"         
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Player not found - db error"
    });
  }
};



// Login
export const getPlayerLogin = async (req, res) => {
  const {email, password} = req.params;
  try {
    const [rows] = await pool.query("SELECT id_player, user, email FROM players WHERE email = ? AND password = ? AND active = 1", [email, password]);
    if (rows.length <= 0) {
      return res.status(404).json({ 
        message: "Player not found"
      });
    }
    res.json({
      message: "Player found",
      player: rows[0]
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Player not found - db error"
    });
  }
}


//Register
export const createPlayer = async (req, res) => {
  const {user, password, email, active} =  req.body;  
  //aquí podemos validar los datos
  try {       
    const [result] = await pool.query("INSERT INTO players (user, password, email, active) VALUES (?, ?, ?, ?)", [user, password, email, active]);    
    res.send(
        {
            "id": result.insertId,
            "user": user,
            "password": password,
            "email": email,
            "active": active
        }
    );
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Player not found - db error"
    });
  }
}
