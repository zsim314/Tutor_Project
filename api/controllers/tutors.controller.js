const { validationResult } = require('express-validator');
const User = require('../models/user.model');

const WEEKDAY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

module.exports.getTutors = (req, res) => {
    const pageSize = req.query.pageSize || 8;
    const pageNumber = req.query.pageNumber || 0;
    const filter = { isTutor: true };
    const search = req.query.searchQuery ? req.query.searchQuery.trim().toLowerCase() : undefined;
    const availableMin = req.query.availableMin || 0;
    const availableMax = req.query.availableMax || 24;
    const date = req.query.date === 'undefined' ? undefined : req.query.date;

    User.find(filter)
        .then(tutors => {
            if (search) {
                tutors = tutors.filter(tutor => {
                    const nameMatch = `${tutor.firstName} ${tutor.lastName}`.toLowerCase().includes(search) || `${tutor.firstName}${tutor.lastName}`.toLowerCase().includes(search);
                    let skillMatch = false;
                    tutor.skills.forEach(skill => {
                        if (skill.includes(search.toUpperCase() || skill.split(' ').join('').includes(search.toUpperCase()))) {
                            skillMatch = true;
                        }
                    });

                    return nameMatch || skillMatch;
                });
            }

            if (date) {
                const filterDate = new Date(date);
                const dow = WEEKDAY[filterDate.getDay()];
                tutors = tutors.filter(tutor => {
                    return tutor.availability[dow].length > 0;
                });
            }

            if (availableMin > -1 && availableMax > -1) {
                tutors = tutors.filter(tutor => {
                    let found = false;
                    for (let i = 0; i < 7; i++) {
                        for (let availability of tutor.availability[WEEKDAY[i]]) {
                            if (availability.from >= availableMin && availability.to <= availableMax) found = true;
                        }
                    }
                    return found;
                });
            }

            const skip = pageNumber * pageSize;

            res.status(200).json({
                tutorCount: tutors.length,
                pageCount: Math.ceil(tutors.length / pageSize),
                pageNumber,
                tutors: tutors.slice(skip, skip + pageSize)
            })
        })
        .catch((error) => { console.log(error); res.status(500).json({ message: 'Failed to fetch tutors.' }); });
};

module.exports.getTutorById = (req, res) => {
    User.findById(req.params.tutorId, '-password')
        .then(user => {
            if (!user) return res.status(404).json({ message: 'No user found with the provided ID.' });
            res.status(200).json(user);
        })
        .catch(() => { res.status(500).json({ message: 'Failed to fetch user.' }); });
};

// do not use this route for signing up tutors
module.exports.createTutor = (req, res) => {
    if (!validationResult(req).isEmpty()) {
        return res.status(400).json({ message: 'One or more required parameters is missing or malformed.' });
    }

    const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'.split(' ');

    const { firstName, lastName, skills, availability } = req.body;

    const tutor = new User({
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}${lastName.toLowerCase()}@utdallas.edu`,
        password: 'password123',
        favoriteTutors: [],
        isTutor: true,
        isAdmin: false,
        aboutMe: lorem.splice(0, Math.floor(Math.random() * lorem.length)).join(' '),
        skills,
        profilePictureUrl: 'https://placeholder.com/assets/images/150x150-2-500x500.png',
        availability
    });

    tutor.save()
        .then(tutor => { res.status(201).json(tutor); })
        .catch((error) => {
            console.log(error);
            res.status(500).json({ message: 'Failed to create tutor.' });
        });
};

module.exports.updateTutor = (req, res) => {
    User.findByIdAndUpdate(req.params.tutorId, req.body, { new: true })
        .then(tutor => { res.status(200).json({ message: 'Updated tutor', tutor }); })
        .catch(() => { res.status(500).json({ message: 'Failed to update tutor.' }); });
};

module.exports.deleteTutor = (req, res) => {
    User.findByIdAndDelete(req.params.tutorId)
        .then(() => { res.status(204).json({ message: 'Deleted tutor.' }); })
        .catch(() => { res.status(500).json({ message: 'Failed to delete tutor.' }); });
}