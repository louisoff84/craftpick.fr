// server.js - simple API with auth (register/login), status, stats, vote, shop
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname,'craftpick.db');
const initSql = fs.readFileSync(path.join(__dirname,'init_db.sql'),'utf-8');

if(!fs.existsSync(DB_FILE)){
  const tmp = new sqlite3.Database(DB_FILE);
  tmp.exec(initSql, err => { if(err) console.error(err); tmp.close(); });
}

const db = new sqlite3.Database(DB_FILE);
const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const PORT = process.env.PORT || 4000;

function runSql(sql, params=[]) {
  return new Promise((res, rej) => db.run(sql, params, function(err){ if(err) rej(err); else res(this); }));
}
function getSql(sql, params=[]){
  return new Promise((res, rej) => db.get(sql, params, (err,row)=>{ if(err) rej(err); else res(row); }));
}
function allSql(sql, params=[]){
  return new Promise((res, rej) => db.all(sql, params, (err,rows)=>{ if(err) rej(err); else res(rows); }));
}

// Register
app.post('/api/auth/register', async (req, res) => {
  const { user, pass, email } = req.body;
  if(!user || !pass) return res.status(400).json({ message: 'Champs manquants' });
  try {
    const hash = await bcrypt.hash(pass, 10);
    await runSql('INSERT INTO users(username,email,pass_hash) VALUES(?,?,?)', [user, email||'', hash]);
    // create token
    const token = jwt.sign({ user }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch(err){
    if(err && err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ message: 'Pseudo déjà utilisé' });
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Login
app.post('/api/auth/login', async (req,res) => {
  const { user, pass } = req.body;
  if(!user || !pass) return res.status(400).json({ message: 'Champs manquants' });
  try{
    const row = await getSql('SELECT * FROM users WHERE username = ?', [user]);
    if(!row) return res.status(401).json({ message: 'Utilisateur introuvable' });
    const ok = await bcrypt.compare(pass, row.pass_hash);
    if(!ok) return res.status(401).json({ message: 'Mot de passe incorrect' });
    const token = jwt.sign({ user }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch(err){ console.error(err); res.status(500).json({ message:'Erreur' }); }
});

// Public status (could be replaced by real mc status fetcher)
app.get('/api/status', async (req,res) => {
  // For demo: random players
  const online = Math.random() > 0.05;
  const players = online ? Math.floor(Math.random() * 100) : 0;
  res.json({ online, players, max: 200, motd: 'Craftpick Network — Mini-jeux 1.8.8' });
});

// Stats
app.get('/api/stats', async (req,res) => {
  try{
    const totalGames = (await getSql('SELECT value FROM stats WHERE key = ?', ['totalGames'])) || {value:'0'};
    const arenas = (await getSql('SELECT value FROM stats WHERE key = ?', ['arenas'])) || {value:'0'};
    const avgDuration = (await getSql('SELECT value FROM stats WHERE key = ?', ['avgDuration'])) || {value:'—'};
    res.json({ totalGames: Number(totalGames.value), arenas: Number(arenas.value), avgDuration: avgDuration.value });
  }catch(err){ console.error(err); res.status(500).json({message:'Erreur'}); }
});

// Vote endpoint (simple)
app.post('/api/vote', (req,res)=>{
  // validate token if needed
  // Increment totalGames as a demo of write access
  db.run('UPDATE stats SET value = CAST(value AS INTEGER) + 1 WHERE key = ?', ['totalGames'], function(err){
    if(err){ console.error(err); return res.status(500).json({message:'Erreur'}); }
    res.json({ ok:true, message:'Merci pour ton vote !' });
  });
});

// Shop placeholder
app.get('/api/shop', (req,res)=>{
  res.json({ items: [ {id:1,name:'Grade VIP',price:4.99}, {id:2,name:'Cosmétique Épée',price:1.99} ] });
});

app.listen(PORT, ()=> console.log('API started on', PORT));
