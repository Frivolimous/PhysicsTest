var firebaseConfig = {
  apiKey: "AIzaSyCPO9qNKT0DWOU5YHgYGVB5K9jwx1GzyvU",
  authDomain: "testingground-99ffa.firebaseapp.com",
  databaseURL: "https://testingground-99ffa.firebaseio.com",
  projectId: "testingground-99ffa",
  storageBucket: "testingground-99ffa.appspot.com",
  messagingSenderId: "402779785687",
  appId: "1:402779785687:web:81f5e27ec0475a3dd0e392"
};
// Initialize Firebase
firebase.onLog(console.log);
let fireapp = firebase.initializeApp(firebaseConfig);
let db = firebase.firestore();
let auth = firebase.auth();
let uid;

function dbRegister() {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(user => {
      uid = user.uid;
      let data;
      db.doc("users/" + uid).get().then(doc => {
        data = doc.data();
        if (data) {
          db.doc("users/" + uid).update({
            lastUpdate: new Date().getTime(),
          });
        } else { 
          data = {x: 100, y: 100, vX: 0, vY: 0, dragging: false};
          db.doc("users/" + uid).set({
            lastUpdate: new Date().getTime(),
          });
        }
        resolve(data);
      });
    });
    
    firebase.auth().signInAnonymously();
  });
}

function dbFetchObjects() {
  return new Promise(resolve => {
    let docs = [];
    let now = new Date().getTime();
    let expireTime = now - (1000 * 60 * 60); // 1 hour
    db.collection("users")
    .where('lastUpdate', '>', expireTime)
    .get().then(snapshot => {
      snapshot.forEach(doc => {
        if (doc.id !== uid) {
          let obj = doc.data();
          obj.__id = doc.id;
          docs.push(obj);
        }
      });

      resolve(docs);
    });
  });
}

function dbRegisterObject(obj, callback) {
  // db.collection("cities").doc("SF")
  //   .onSnapshot(function(doc) {
  //       var source = doc.metadata.hasPendingWrites ? "Local" : "Server";
  //       console.log(source, " data: ", doc.data());
  //   });

  db.doc('users/' + obj.__id).onSnapshot(doc => {
    let data = doc.data();
    console.log('changes', doc, data);
    callback(data)
  });
}

let dbPostObjectAction = throttle(300, (x, y, vX, vY, dragging) => {
  db.doc('users/' + uid).set({
    lastUpdate: new Date().getTime(),
    x, y, vX, vY, dragging
  });
});