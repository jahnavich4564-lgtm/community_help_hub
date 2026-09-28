const db = require("./config/db");


db.run(

`
UPDATE users

SET

role='volunteer',

skills='medical,medicine',

available=1,

latitude=17.3850,

longitude=78.4867,

rating=5

WHERE email='rahul@test.com'
`,

(err)=>{


    if(err){

        console.log(
            "❌ Update failed:"
        );

        console.log(err.message);

    }
    else{

        console.log(
            "✅ Volunteer updated successfully"
        );

    }


    process.exit();


}

);