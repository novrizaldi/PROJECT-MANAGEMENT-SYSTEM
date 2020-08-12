var express = require('express');
var router = express.Router();
var path = require('path');
var helpers = require('../helpers/auth');
var moment = require('moment');

let checkOption = {
    id: true,
    name: true,
    member: true,
}

let optionMember = {
    id: true,
    name: true,
    position: true
}

let optionIssue = {
    issueid: true,
    subject: true,
    tracker: true,
    description: true
}

/* GET home page. */
module.exports = (db) => {
    // localhost:3000/projects
    router.get('/', helpers.isLoggedIn, function (req, res, next) {
        let link = 'projects'
        let user = req.session.user
        let getData = `SELECT count(id) AS total from (SELECT DISTINCT projects.projectid as id FROM projects 
                       LEFT JOIN members ON members.projectid = projects.projectid 
                       LEFT JOIN users ON users.userid = members.userid `

        let data = []
        if (req.query.checkId && req.query.id) {
            data.push(`projects.projectid=${req.query.id}`)
        }
        if (req.query.checkName && req.query.name) {
            data.push(`projects.name ILIKE '%${req.query.name}%'`)
        }
        if (req.query.checkMember && req.query.member) {
            data.push(`members.userid=${req.query.member}`)
        }
        if (data.length > 0) {
            getData += ` WHERE ${data.join(" AND ")}`
        }
        getData += `) AS projectname`;


        db.query(getData, (err, totaldata) => {
            if (err) return res.json(err)

            //pagination
            const url = req.url == '/' ? '/?page=1' : req.url
            const page = req.query.page || 1
            const limit = 5
            const offset = (page - 1) * limit
            const total = totaldata.rows[0].total
            const pages = Math.ceil(total / limit);

            let getData = `SELECT DISTINCT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname, ', ') as member FROM projects 
                               LEFT JOIN members ON members.projectid = projects.projectid 
                               LEFT JOIN users ON users.userid = members.userid `

            if (data.length > 0) {
                getData += ` WHERE ${data.join(' OR ')}`
            }

            getData += ` GROUP BY projects.projectid ORDER BY projectid ASC LIMIT ${limit} OFFSET ${offset};`

            console.log('data project', getData);
            db.query(getData, (err, dataproject) => {
                if (err) return res.json(err)

                let getUser = `SELECT userid, concat(firstname,' ',lastname) as fullname FROM users;`

                db.query(getUser, (err, datauser) => {
                    if (err) return res.json(err)
                    res.render('projects/list', {
                        url,
                        user,
                        link,
                        page,
                        pages,
                        hasil: dataproject.rows,
                        result: datauser.rows,
                        option: checkOption,
                        login: user
                    })
                })
            })
        })
    })

    // localhost:3000/option
    router.post('/option', helpers.isLoggedIn, (req, res) => {
        checkOption.id = req.body.checkid;
        checkOption.name = req.body.checkname;
        checkOption.member = req.body.checkmember;
        res.redirect('/projects')
    })

    // localhost:3000/projects/add
    router.get('/add', helpers.isLoggedIn, function (req, res, next) {
        let link = 'projects'
        let sql = `SELECT DISTINCT userid, CONCAT (firstname, ' ',lastname) AS fullname FROM users ORDER BY fullname`
        db.query(sql, (err, data) => {
            if (err) return res.json(err)
            res.render('projects/add', {
                link,
                data: data.rows,
                login: req.session.user
            })
        })
    });

    // localhost:3000/projects/add method:post
    router.post('/add', helpers.isLoggedIn, function (req, res, next) {
        const {
            projectname,
            members
        } = req.body

        if (projectname && members) {
            const insertProject = `INSERT INTO projects (name) VALUES ('${projectname}')`

            db.query(insertProject, (err) => {
                if (err) return res.status(500).json(err)
                let selectMaxId = `SELECT MAX (projectid) FROM projects`

                db.query(selectMaxId, (err, data) => {
                    if (err) return res.status(500).json(err)
                    let idMax = data.rows[0].max;
                    console.log('ini id max', idMax);
                    let insertMembers = `INSERT INTO members (userid, projectid) VALUES`
                    console.log('ini member', members);
                    if (typeof members == 'string') {
                        insertMembers += `(${members}, ${idMax})`
                    } else {
                        let member = members.map(item => { //map, untuk melintasi item member dan membuat instance baru
                            return `(${item}, ${idMax})` // ex hasilnya (4,19) (6,19)
                        }).join()

                        insertMembers += `${member}` // ( (userid, projectid max) (4,19),(6,19) )
                        console.log('ini 2 member', member);
                    }

                    db.query(insertMembers, (err) => {
                        if (err) return res.status(500).json({
                            error: true,
                            message: err
                        })
                        console.log('insert memmber', insertMembers);
                        res.redirect('/projects')
                    })
                })
            })
        } else {
            return res.redirect('/projects/add')
        }
    });

    // localhost:3000/projects/edit/1
    router.get('/edit/:projectid', helpers.isLoggedIn, (req, res) => {

        let projectid = req.params.projectid
        let link = 'projects'
        let sql = `SELECT projects.name FROM projects WHERE projectid = ${projectid}`

        db.query(sql, (err, data) => {
            if (err) return res.status(500).json
            let nameProject = data.rows[0]

            let sqlMember = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname 
                             FROM users ORDER BY fullname`

            db.query(sqlMember, (err, member) => {
                if (err) return res.status(500).json
                let members = member.rows;

                let sqlMembers = `SELECT members.userid, projects.name, projects.projectid FROM members 
                                  LEFT JOIN projects ON members.projectid = projects.projectid  WHERE projects.projectid = ${projectid};`

                db.query(sqlMembers, (err, dataMembers) => {
                    if (err) return res.status(500).json({
                        error: true,
                        message: err
                    })
                    let dataMember = dataMembers.rows.map(item => item.userid)
                    console.log(dataMember);
                    res.render('projects/edit', {
                        dataMember,
                        nameProject,
                        members,
                        link,
                        login: req.session.user
                    })
                })

            })
        })
    });

    // localhost:3000/projects/edit/1 method:post
    router.post('/edit/:projectid', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid
        const {
            editprojectname,
            editmembers
        } = req.body
        let sqlProjectname = `UPDATE projects SET name = '${editprojectname}' WHERE projectid = ${projectid}`

        if (projectid && editprojectname && editmembers) {

            db.query(sqlProjectname, (err) => {
                if (err) return res.status(500).json({
                    error: true,
                    message: err
                })

                let sqlDeletemember = `DELETE FROM members WHERE projectid = ${projectid}`

                db.query(sqlDeletemember, (err) => {
                    if (err) return res.status(500).json({
                        error: true,
                        message: err
                    })

                    let result = [];

                    if (typeof editmembers == 'string') {
                        result.push(`(${editmembers},${projectid})`);
                    } else {
                        for (let i = 0; i < editmembers.length; i++) {
                            result.push(`(${editmembers[i]},${projectid})`)
                        }
                    }
                    console.log('result', result);
                    let sqlUpdate = `INSERT INTO members (userid, projectid) VALUES ${result.join(",")}`

                    db.query(sqlUpdate, (err) => {
                        if (err) return res.status(500).json({
                            error: true,
                            message: err
                        })
                        res.redirect('/projects')
                    })
                })
            })
        } else {
            res.redirect(`/projects/edit/${projectid}`)
        }
    });

    // localhost:3000/projects/delete/1 method:get
    router.get('/delete/:projectid', helpers.isLoggedIn, function (req, res, next) {
        let projectid = parseInt(req.params.projectid)

        let deletemember = `DELETE FROM members WHERE projectid= ${projectid};` //harus member yang di delete dahulu karna ada projectid di dalamnya
        db.query(deletemember, (err) => {
            if (err) return res.status(500).json

            let deleteProject = `DELETE FROM projects WHERE projectid= ${projectid};`
            db.query(deleteProject, err => {
                if (err) return res.status(500).json({
                    error: true,
                    message: err
                })
                res.redirect('/projects')
            })
        })
    });

    // localhost:3000/projects/1/overview
    router.get('/:projectid/overview', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid

        let sql = `SELECT * FROM projects WHERE projectid = ${projectid}`

        db.query(sql, (err, data) => {
            if (err) return res.status(500).json
            let nameProject = data.rows[0]

            let sqlMember = `SELECT users.firstname, users.lastname, members.role FROM members
                            LEFT JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid}`

            db.query(sqlMember, (err, member) => {
                if (err) return res.status(500).json
                let members = member.rows;

                let sqlIssues = `SELECT tracker, status FROM issues WHERE projectid = ${projectid}`

                db.query(sqlIssues, (err, dataIssues) => {
                    if (err) return res.status(500).json({
                        error: true,
                        message: err
                    })

                    let bugOpen = 0;
                    let bugTotal = 0;
                    let featureOpen = 0;
                    let featureTotal = 0;
                    let supportOpen = 0;
                    let supportTotal = 0;

                    dataIssues.rows.forEach(item => {
                        if (item.tracker == 'Bug' && item.status !== "closed") {
                            bugOpen += 1
                        }
                        if (item.tracker == 'Bug') {
                            bugTotal += 1
                        }
                    })

                    dataIssues.rows.forEach(item => {
                        if (item.tracker == 'Feature' && item.status !== "closed") {
                            featureOpen += 1
                        }
                        if (item.tracker == 'Feature') {
                            featureTotal += 1
                        }
                    })

                    dataIssues.rows.forEach(item => {
                        if (item.tracker == 'Support' && item.status !== "closed") {
                            supportOpen += 1
                        }
                        if (item.tracker == 'Support') {
                            supportTotal += 1
                        }
                    })
                    res.render('projects/overview/view', {
                        projectid,
                        nameProject,
                        members,
                        bugOpen,
                        bugTotal,
                        featureOpen,
                        featureTotal,
                        supportOpen,
                        supportTotal,
                        login: req.session.user
                    })
                })
            })
        })
    });

    // localhost:3000/projects/1/members
    router.get('/:projectid/members', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid
        let user = req.session.user

        let sqlFilter = `SELECT COUNT(member) AS total FROM(SELECT members.userid FROM members 
                            JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid}`;

        let result = []
        if (req.query.checkId && req.query.memberId) {
            result.push(`members.id=${req.query.memberId}`)
        }

        if (req.query.checkName && req.query.memberName) {
            result.push(`CONCAT(users.firstname,' ',users.lastname) ILIKE '%${req.query.memberName}%'`)
        }

        if (req.query.checkPosition && req.query.position) {
            result.push(`members.role = '${req.query.position}'`)
        }

        if (result.length > 0) {
            sqlFilter += ` AND ${result.join(' AND ')}`
        }
        sqlFilter += `) AS member`
        console.log(sqlFilter);
        db.query(sqlFilter, (err, totaldata) => {
            if (err) return res.json(err)

            //pagination
            const url = req.url == '/' ? '/?page=1' : req.url
            const page = req.query.page || 1
            const limit = 5
            const offset = (page - 1) * limit
            const total = totaldata.rows[0].total
            const pages = Math.ceil(total / limit);

            let sqlFilter = `SELECT users.userid, users.position, projects.name, projects.projectid, members.id, members.role, 
                         CONCAT(users.firstname,' ',users.lastname) AS fullname FROM members
                         LEFT JOIN projects ON projects.projectid = members.projectid
                         LEFT JOIN users ON users.userid = members.userid WHERE members.projectid = ${projectid}`


            if (result.length > 0) {
                getData += ` WHERE ${data.join(' AND ')}`
            }

            sqlFilter += `ORDER BY members.id ASC LIMIT ${limit} OFFSET ${offset}; `

            db.query(sqlFilter, (err, datauser) => {
                if (err) return res.json(err)

                let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`

                db.query(sqlProject, (err, dataProject) => {
                    if (err) return res.status(500).json({
                        error: true,
                        message: err
                    })
                    res.render('projects/members/list', {
                        url,
                        page,
                        pages,
                        projectid,
                        user,
                        project: dataProject.rows[0],
                        data: datauser.rows,
                        option: optionMember,
                        login: user
                    })
                })
            })
        })
    })

    router.post('/:projectid/members/option', helpers.isLoggedIn, (req, res) => {
        const projectid = req.params.projectid;

        optionMember.id = req.body.checkid;
        optionMember.name = req.body.checkname;
        optionMember.position = req.body.checkposition;
        res.redirect(`/projects/${projectid}/members`)
    })

    // localhost:3000/projects/1/members/add
    router.get('/:projectid/members/add', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid
        let link = 'projects'

        let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
        db.query(sqlProject, (err, dataProject) => {
            if (err) return res.status(500).json({
                error: true,
                message: err
            })

            let sqlMember = `SELECT userid, CONCAT(firstname,' ',lastname) AS fullname FROM users
                WHERE userid NOT IN (SELECT userid FROM members WHERE projectid = ${projectid})`

            db.query(sqlMember, (err, dataMember) => {
                if (err) return res.status(500).json({
                    error: true,
                    message: err
                })

                res.render(`projects/members/add`, {
                    projectid,
                    link,
                    members: dataMember.rows,
                    projects: dataProject.rows,
                    login: req.session.user
                })
            })
        })
    });

    // localhost:3000/projects/members/1/add method:post
    router.post('/:projectid/members/add', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid
        const {
            inputmember,
            inputposition
        } = req.body

        let sql = `INSERT INTO members (userid, role, projectid) VALUES ($1,$2,$3)`
        let insertMembers = [inputmember, inputposition, projectid]
        db.query(sql, insertMembers, (err) => {
            if (err) return res.status(500).json({
                error: true,
                message: err
            })
            res.redirect(`/projects/${projectid}/members`)
        })
    });

    // localhost:3000/projects/members/1/edit/2
    router.get('/:projectid/members/edit/:id', function (req, res, next) {
        let projectid = req.params.projectid
        let id = req.params.id

        let sqlMembers = `SELECT id, role, CONCAT(firstname,' ',lastname) AS fullname FROM members 
                            LEFT JOIN users ON members.userid = users.userid WHERE projectid = ${projectid} AND id = ${id};`

        db.query(sqlMembers, (err, dataMember) => {
            if (err) return res.status(500).json({
                error: true,
                message: err
            })
            console.log(dataMember.rows);
            
            let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
            db.query(sqlProject, (err, dataProject) => {
                if (err) return res.status(500).json({
                    error: true,
                    message: err
                })
                console.log(dataProject.rows);
                res.render('projects/members/edit', {
                    projectid,
                    id,
                    member: dataMember.rows[0],
                    project: dataProject.rows[0]
                })
            })
        })
    });

    // localhost:3000/projects/members/1/edit/2 method:post
    router.post('/:projectid/members/edit/:id', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid
        let id = req.params.id;
        let position = req.body.inputposition;

        let sql = `UPDATE members SET role='${position}' WHERE id=${id}`

        db.query(sql, (err) => {
            if (err) return res.status(500).json({
                error: true,
                message: err
            })
            res.redirect(`/projects/${projectid}/members`)
        })
    });

    // localhost:3000/projects/members/1/delete/2
    router.get('/:projectid/members/delete/:id', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid
        let id = req.params.id

        let deletemember = `DELETE FROM members WHERE projectid= ${projectid} AND id=${id};`
        db.query(deletemember, (err) => {
            if (err) return res.status(500).json({
                error: true,
                message: err
            })
            res.redirect(`/projects/${projectid}/members`)
        })
    });

    // localhost:3000/option
    router.post('/:projectid/issues/option', helpers.isLoggedIn, (req, res) => {
        const projectid = req.params.projectid;

        optionIssue.issueid = req.body.checkid;
        optionIssue.subject = req.body.checksubject;
        optionIssue.tracker = req.body.checktracker;
        optionIssue.description = req.body.checkdescription;
        res.redirect(`/projects/${projectid}/issues`)
    })

    // localhost:3000/projects/1/issues
    router.get('/:projectid/issues', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid
        let sqlIssue = `SELECT issueid, tracker, subject, description, projects.projectid, projects.name FROM issues
        LEFT JOIN projects ON issues.projectid = projects.projectid WHERE projects.projectid = ${projectid}`

        db.query(sqlIssue, (err, data) => {
            if (err) return res.json(err)

            let dataproject = data.rows
            console.log(dataproject);
            res.render(`projects/issues/list`, {
                projectid,
                dataproject,
                data: data.rows,
                login: req.session.user,
                option: optionIssue
            })
        })
    });

    // localhost:3000/projects/issues/1/add
    router.get('/:projectid/issues/add', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid

        let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
        db.query(sqlProject, (err, dataproject) => {
            if (err) return res.json(err)
            console.log('data project', dataproject.rows);

            let sqlMembers = `SELECT users.userid, CONCAT(users.firstname,' ',users.lastname) AS fullname FROM members
            LEFT JOIN users ON members.userid = users.userid WHERE projectid=${projectid}`


            db.query(sqlMembers, (err, members) => {
                if (err) return res.json(err)

                console.log('data members', members.rows);
                res.render(`projects/issues/add`, {

                    projectid,
                    project: dataproject.rows[0],
                    member: members.rows,
                    login: req.session.user
                })
            })
        })
    });

    // localhost:3000/projects/issues/1/add method:post
    router.post('/:projectid/issues/add', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid
        let formAdd = req.body
        let user = req.session.user

        //Issues by files
        if (req.files) {
            let file = req.files.file

            let fileName = file.name.toLowerCase().replace("", Date.now()).split(" ").join("-")

            let sqlIssue = `INSERT INTO issues(projectid, tracker, subject, description, status, priority, assigne, startdate, duedate, estimatedtime, done, files, author, createddate)
                             VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`

            let values = [projectid, formAdd.tracker, formAdd.subject, formAdd.description, formAdd.status, formAdd.priority, parseInt(formAdd.assignee), formAdd.startDate, formAdd.dueDate, parseInt(formAdd.estimatedTime), parseInt(formAdd.done), fileName, user.userid]

            db.query(sqlIssue, values, (err) => {
                if (err) return res.status(500).json({
                    error: true,
                    message: err
                })
                file.mv(path.join(__dirname, "..", "public", "upload", fileName), function (err) {
                    if (err) return res.status(500).send(err)
                    res.redirect(`/projects/${projectid}/issues`)
                })
            })

            // Issues without file
        } else {
            let sqlIssue = `INSERT INTO issues(projectid, tracker, subject, description, status, priority, assigne, startdate, duedate, estimatedtime, done, author, createddate)
                            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`

            let values = [projectid, formAdd.tracker, formAdd.subject, formAdd.description, formAdd.status, formAdd.priority, parseInt(formAdd.assignee), formAdd.startDate, formAdd.dueDate, parseInt(formAdd.estimatedTime), parseInt(formAdd.done), user.userid]

            db.query(sqlIssue, values, (err) => {
                if (err) return res.status(500).json({
                    error: true,
                    message: err
                })
                res.redirect(`/projects/${projectid}/issues`)
            })
        }
    });

    // localhost:3000/projects/1/issues/edit/2
    router.get('/:projectid/issues/edit/:issueid', function (req, res, next) {
        let projectid = req.params.projectid
        let issueId = req.params.issueid
        const link = 'projects'
        const url = 'issues'

        let sqlProject = `SELECT * FROM projects WHERE projectid=${projectid}`

        db.query(sqlProject, (err, dataProject) => {
            if (err) return res.status(500).json({
                error: true,
                message: err
            })
            let project = dataProject.rows[0]

            let sqlIssue = `SELECT issues.*, CONCAT(users.firstname,' ',users.lastname) AS authorname FROM issues
          LEFT JOIN users ON issues.author=users.userid WHERE projectid=${projectid} AND issueid=${issueId}`

            db.query(sqlIssue, (err, issueData) => {
                if (err) return res.status(500).json({
                    error: true,
                    message: err
                })
                let issue = issueData.rows[0]
                console.log('issue', issue);

                let sqlMembers = `SELECT users.userid, CONCAT(users.firstname,' ',users.lastname) AS fullname FROM members
                                  LEFT JOIN users ON members.userid = users.userid WHERE projectid=${projectid}`

                db.query(sqlMembers, (err, dataMember) => {
                    if (err) return res.status(500).json({
                        error: true,
                        message: err
                    })
                    let members = dataMember.rows

                    let sqlPerent = `SELECT issueid, subject, tracker FROM issues WHERE projectid=${projectid}`

                    db.query(sqlPerent, (err, dataPerent) => {
                        if (err) return res.status(500).json({
                            error: true,
                            message: err
                        })
                        let perents = dataPerent.rows

                        res.render('projects/issues/edit', {
                            moment,
                            perents,
                            members,
                            issue,
                            project,
                            projectid,
                            link,
                            url,
                            login: req.session.user
                        })
                    })
                })
            })
        })
    });

    // localhost:3000/projects/issues/1/edit/2 method:post
    router.post('/:projectid/issues/edit/:issueid', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid
        let issueid = req.params.issueid
        let formEdit = req.body
        let user = req.session.user

        let title = `${formEdit.subject} #${issueid} (${formEdit.tracker}) - [${formEdit.status}]`
        let desc = `Spent Time by Hours : from ${formEdit.oldspent} updated to ${formEdit.spenttime}`

        let sqlActivity = `INSERT INTO activity (time, title, description, author, projectid, olddone, nowdone) 
                           VALUES(NOW(), $1, $2, $3, $4, $5, $6)`

        let value = [title, desc, user.userid, projectid, formEdit.olddone, formEdit.done]

        //Issues by files
        if (req.files) {
            let file = req.files.file

            let fileName = file.name.toLowerCase().replace("", Date.now()).split(" ").join("-")

            let sqlupdate = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, assigne = $5, duedate = $6, done = $7, 
                             parenttask = $8, spenttime = $9, targetversion = $10, updateddate = NOW() ${formEdit.status == 'closed' ? `, closeddate = NOW() ` : " "} WHERE issueid = $11`

            let values = [formEdit.subject, formEdit.description, formEdit.status, formEdit.priority, parseInt(formEdit.assignee), formEdit.dueDate, parseInt(formEdit.done),
                parseInt(formEdit.perenttask), parseInt(formEdit.spenttime), formEdit.target, issueid
            ]

            // console.log('data upload', values);
            // console.log('sql update', sqlupdate);       

            db.query(sqlupdate, values, (err) => {
                if (err) return res.status(500).json({
                    error: true,
                    message: err
                })
                file.mv(path.join(__dirname, "..", "public", "upload", fileName), function (err) {
                    if (err) return res.status(500).send(err)

                    db.query(sqlActivity, value, (err) => {
                        if (err) return res.status(500).json({
                            error: true,
                            message: err
                        })

                        res.redirect(`/projects/${projectid}/issues`)
                    })
                })
            })

            //Issues without file
        } else {
            let sqlupdate = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, assigne = $5, duedate = $6, done = $7, 
                             parenttask = $8, spenttime = $9, targetversion = $10, updateddate = NOW() ${formEdit.status == 'closed' ? `, closeddate = NOW() ` : " "}WHERE issueid = $11`

            let values = [formEdit.subject, formEdit.description, formEdit.status, formEdit.priority, parseInt(formEdit.assignee), formEdit.dueDate, parseInt(formEdit.done),
                parseInt(formEdit.perenttask), parseInt(formEdit.spenttime), formEdit.target, issueid
            ]

            console.log('data upload', values);
            console.log('sql update', sqlupdate);   
            db.query(sqlupdate, values, (err) => {
                if (err) return res.status(500).json({
                    error: "true",
                    message: err
                })
             
                db.query(sqlActivity, value, (err) => {
                    if (err) return res.status(500).json({
                        error: true,
                        message: err
                    })

                    res.redirect(`/projects/${projectid}/issues`)
                })
            })
        }
    });

    // localhost:3000/projects/1/issues/delete/2
    router.get('/:projectid/issues/delete/:issueid', function (req, res, next) {
        let projectid = req.params.projectid
        let issueid = req.params.issueid

        let sqldelete = `DELETE FROM issues WHERE issueid = ${issueid}`

        db.query(sqldelete, (err) => {
            if (err) return res.status(500).json
            res.redirect(`/projects/${projectid}/issues`)
        })
    });

    // localhost:3000/projects/activity/1
    router.get('/:projectid/activity', helpers.isLoggedIn, function (req, res, next) {
        let projectid = req.params.projectid

        let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
        db.query(sqlProject, (err, dataproject) => {
            if (err) return res.status(500).json

            let project = dataproject.rows[0];

            let sqlActivity = `SELECT activity.*, CONCAT (users.firstname,' ', users.lastname) as authorname,
            (time AT TIME ZONE 'Asia/Jakarta'):: time AS timeactivity,
            (time AT TIME ZONE 'Asia/Jakarta'):: date AS dateactivity FROM activity
            LEFT JOIN users ON activity.author = users.userid WHERE projectid= ${projectid}
            ORDER BY dateactivity DESC, timeactivity DESC`

            db.query(sqlActivity, (err, dataactivity) => {
                if (err) return res.status(500).json

                let activity = dataactivity.rows

                console.log('data activity', activity);
                
                activity.forEach(item => {
                    item.dateactivity = moment(item.dateactivity).format('YYYY-MM-DD');
                    console.log(item.dateactivity);
                    item.timeactivity = moment(item.timeactivity).format('HH:mm:ss');

                    if(item.dateactivity == moment().format('YYYY-MM-DD')) {
                        item.dateactivity = 'today'
                    } else if (item.dateactivity == moment().subtract(1, 'days').format('YYYY-MM-DD')) {
                        item.dateactivity == 'yesterday' 
                    } else (item.dateactivity == moment().format('MMM do, yyyy'))
                })
                res.render('projects/activity/view', {
                    moment,
                    activity,
                    project,
                    projectid,
                    login : req.session.user
                })
            })
        })
    })
    return router;
}