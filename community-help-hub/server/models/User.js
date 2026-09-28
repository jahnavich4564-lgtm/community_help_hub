const db = require("../config/db");



// FIND VOLUNTEERS

exports.findVolunteers = ()=>{


    return new Promise((resolve,reject)=>{


        db.all(

            `
            SELECT *
            FROM users
            WHERE role='volunteer'
            AND available=1
            `,

            [],

            (err,rows)=>{


                if(err)
                    reject(err);

                else
                    resolve(rows);


            }

        );


    });


};




// FIND USER

exports.findById=(id)=>{


    return new Promise((resolve,reject)=>{


        db.get(

            `
            SELECT *
            FROM users
            WHERE id=?
            `,

            [id],

            (err,row)=>{


                if(err)
                    reject(err);

                else
                    resolve(row);


            }


        );


    });


};