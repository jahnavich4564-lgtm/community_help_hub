const db = require("../config/db");


// CREATE HELP REQUEST

exports.create = (data) => {

    return new Promise((resolve, reject) => {

        const {
            title,
            description,
            category,
            location,
            urgency,
            userId,
            communityId
        } = data;


        db.run(

            `
            INSERT INTO help_requests
            (
                userId,
                communityId,
                title,
                description,
                category,
                location,
                urgency,
                status
            )

            VALUES(?,?,?,?,?,?,?,?)
            `,

            [

                userId,
                communityId || null,
                title,
                description,
                category,
                location,
                urgency || "Normal",
                "Open"

            ],

            function(err){

                if(err){

                    reject(err);

                }
                else{

                    resolve({

                        id:this.lastID,
                        ...data,
                        status:"Open"

                    });

                }

            }

        );


    });

};




// GET ALL HELP REQUESTS

exports.find = ()=>{


    return new Promise((resolve,reject)=>{


        db.all(

            `
            SELECT 
            h.*,
            u.name AS requesterName,
            u.email AS requesterEmail

            FROM help_requests h

            LEFT JOIN users u

            ON h.userId=u.id

            ORDER BY h.id DESC

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




// GET OPEN REQUESTS

exports.findOpen = ()=>{


    return new Promise((resolve,reject)=>{


        db.all(

            `
            SELECT *
            FROM help_requests
            WHERE status='Open'
            ORDER BY id DESC
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




// FIND BY ID

exports.findById=(id)=>{


    return new Promise((resolve,reject)=>{


        db.get(

            `
            SELECT *
            FROM help_requests
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




// UPDATE STATUS

exports.updateStatus=(id,status)=>{


    return new Promise((resolve,reject)=>{


        db.run(

            `
            UPDATE help_requests
            SET status=?
            WHERE id=?
            `,

            [
                status,
                id
            ],

            function(err){

                if(err)
                    reject(err);

                else
                    resolve(this.changes);

            }


        );


    });


};