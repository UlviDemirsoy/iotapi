const express = require("express");
const app = express();
const admin = require("firebase-admin");
const credentials = require("./key.json");
const redis = require('redis');

admin.initializeApp({
    credential: admin.credential.cert(credentials)
});

const db = admin.firestore();
const PORT = process.env.PORT || 8080;
const client = redis.createClient();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/temperature', async (req, res) => {
    console.log("request incoming");
    try {


        const dataJson = {
            tempData: parseFloat(req.body.tempData),
            ldrData: parseFloat(req.body.ldrData),
            timestamp: Date.now()  // Use Date.now() to get the current timestamp
        };

        console.log("alert-calculation-start ");
        const snapshot = await db.collection('data').orderBy("timestamp", "desc").get();
        const dataArray = snapshot.docs.map(doc => ({ id: doc.id,
             ...doc.data() }));

        const firstThreeElements = dataArray.slice(0, 3);
       
        const sumTemp = firstThreeElements.reduce((sum, element) => sum + element.tempData, 0);
        const averageTemp = sumTemp / firstThreeElements.length;

        // Calculate average light
        const sumLight = firstThreeElements.reduce((sum, element) => sum + element.ldrData, 0);
        const averageLight = sumLight / firstThreeElements.length;
        
        console.log("Average Temperature > ", averageTemp, "Average Light > ", averageLight );

        if(averageTemp + 2 < dataJson.tempData ){
            console.log("Aşırı ısınma");
        }
        if(averageTemp - 2 > dataJson.tempData ){
            console.log("Aşırı soğuma");
        }

        if(averageLight  + 10 < dataJson.ldrData){
            console.log("Aşırı ışık artışı");
        }
        if(averageLight  - 10> dataJson.ldrData){
            console.log("Aşırı ışık azalışı");
        }

        console.log("alert-calculation-end ");

        console.log(dataJson);
        console.log("db-write-start ");
        // Wait for the Firestore add operation to complete
        const response = await db.collection("data").add(dataJson);
        console.log("db-write-end ");
        

        res.send(response.id); // Send the document ID in the response
    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}.`);
});