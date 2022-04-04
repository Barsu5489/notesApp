import express, { response } from 'express';
import mysql from 'mysql';
import bcrypt from 'bcrypt';
import session from 'express-session'
//  import notes from './data.js' ;




const app= express();

const connection = mysql.createConnection({
host:'localhost',
user:'root',
password:'',
database:'notesapp'
});

//prepearing to use the express session package
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    
  }))
app.use((req,res,next)=>{

    if(req.session.userId===undefined){
        res.locals.isloggedIn = false;
    
       
    }else{
        res.locals.isloggedIn = true;
        res.locals.username = req.session.username;
       
    }

    next();
})
connection.query(
    'SELECT * FROM notes',(error,results)=>{
        if(error)console.log(error)
        // console.log(results)
    }
);

    
app.set('view engine', 'ejs')
app.set('views', './views')
app.use(express.static('public'))
//required configuration for accessing form values
app.use(express.urlencoded({extended:false}))

let name = 'Emmanuel'

app.get('/', (req,res)=>{
   res.render('index.ejs', {user:name})
    
})
// app.get('/books',()=>{
//     console.log('bboks page')
// })
app.get('/notes', (req,res)=>{
    if(res.locals.isloggedIn){
    connection.query(
        'SELECT * FROM notes WHERE userID =?',[req.session.userId],(error,results)=>{
      
        
    res.render('notes.ejs',{notes:results})
        }
    )
    }else{
        res.redirect('/login')
    }
    })
    //viewing individual notes(/:id) route parameter

    app.get('/note/:id',(req,res)=>{
        if(res.locals.isloggedIn){

        
       
        connection.query(
            'SELECT * FROM notes WHERE id = ? AND userID = ?',[req.params.id, req.session.userId],//the question mark(?) is like a placeholder of what is going to be put there
            (error,results)=>{
                if(results.length > 0 ){
                    res.render('single-note.ejs',{note:results[0]})
                } else{
                    res.redirect('/notes');
                }
                
            
            }
        )
    }else{
        res.redirect('/login')
    }
        
    })
    //display form to add a new note
    app.get('/create',(req,res)=>{
     
        if(res.locals.isloggedIn){
            res.render('new-note.ejs')
        }else{
            res.redirect('/login')
        }
       
    })
    //add note to database
    app.post('/create',(req,res)=>{
        connection.query(
            'INSERT INTO notes (title,body,userID) VALUES(?,?,?)',
            [req.body.title, req.body.body, req.session.userId],
            (error,result)=>{
                res.redirect('/notes')
            }
        );
        // let note= {
        //     title:req.body.title,
        //     body:req.body.body
        // }
        // console.log(note)
    })
    //display form to edit note
    app.get('/edit/:id',(req,res)=>{
        if(res.locals.isloggedIn){
            
        
        connection.query(
            'SELECT * FROM notes WHERE id AND userID =?',[req.params.id,req.session.userId],(error,results)=>{
                res.render('edit-note.ejs',{note:results[0]})
            }
        )
    }else{
        res.redirect('/login',{error:false})
    }
    })
    //
    app.post('/edit/:id',(req,res)=>{
        connection.query(
            'UPDATE notes SET title  = ? , body=? WHERE id=? AND userID =?',[req.body.title, req.body.body, req.params.id, req.session.userId],
            (error,results)=>{
                res.redirect('/notes')
            }
        )
    })
    app.post('/delete/:id', (req, res)=>{
        connection.query(
            'DELETE FROM notes WHERE id = ?',
            [req.params.id],
            (error,results)=>{
                res.redirect('/notes');
            }
        )

    })
      //Displaying login form
      app.get('/login',(req,res)=>{
          if(res.locals.isloggedIn){
              res.redirect('/notes')
          }else{
              res.render('login',{error:false})
          }

    })
    //Sumbiting Login form for user authentication
    app.post('/login',(req,res)=>{
        let email = req.body.email;
        let password = req.body.password;

        connection.query(
            'SELECT * FROM users WHERE email = ?',[email],
            (error,results)=>{
                if(results.length > 0){
                    bcrypt.compare(password, results[0].password, (error, isEqual)=>{
                        
                        if(isEqual){
                            req.session.userId=results[0].id;
                            req.session.username=results[0].username;

                            res.redirect('/notes')

                     }else{
                        
                        let message = 'Email/Password mismatch'
                        res.render('login.ejs',{
                            error:true,
                            errorMessage:message, 
                            email:email, 
                            password:password
                            
                        })
                        

                     }
                 })
                }else{
                    // console.log('user does not exist')
                    let message='Account does not exist. Please create one'
                    res.render('login.ejs', {
                        error:true,
                         errorMessage:message,
                         email:email,
                         password:password})
                }
            }
        )
    })

    app.get('/logout',(req,res)=>{
        req.session.destroy((error)=>{
            res.redirect('/')
        })
    })
    //display sign up form 
    app.get('/signup',(req,res)=>{
        if(res.locals.isloggedIn){
            res.redirect('/notes')
        }else{
            res.render('signup.ejs',{error:false})
        }
    
    })
    //display signup  form for user registration
    app.post('/signup',(req,res)=>{
        let email = req.body.email
        let username = req.body.username 
        let password = req.body.password
        let confirmPassword = req.body.confirmPassword

        // const emailExists = email =>{
        //     connection.query(
        //         'SELECT * email FROM users WHERE email = ?', [email],(error,results)=>{
        //             console.log( results.length > 0 )
        //         }
        //     )
        // }
        if(password === confirmPassword){
       
          bcrypt.hash(password, 10, (error,hash)=>{
            connection.query(
                'SELECT email FROM users WHERE email = ?', [email],
                (error,results)=>{
                   if(results.length === 0){
                       connection.query(
                           'INSERT INTO users (email,username,password) VALUES(?,?,?)',
                           [email,username,hash],
                           (error,reults)=>{
                                res.redirect('/login');
                           }
                       )
                    }else{
                       let message = 'Email alredy exists.'
                       res.render('signup.ejs',{
                        error:true,
                        errorMessage:message,
                        email:email,
                        username:username,
                        password:password,
                        confirmPassword:confirmPassword
                       })
                   }
                }
            )
            

          })
           
        }else{
            let message = 'password & Confrim Password do not match'
            res.render('signup.ejs',{
                error:true, 
                errorMessage:message,
                email:email,
                username:username,
                password:password,
                confirmPassword:confirmPassword})
        }
       

    })
   

    //page not found(set after all different routes)
    app.get('*',(req,res)=>{
        res.render('404.ejs')
    })
  
app.listen(3000);
