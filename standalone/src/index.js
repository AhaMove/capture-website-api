import express from 'express';
import {doCaptureWork, latestCapture, latestCapturePage, queue, showResults, allowedRequest} from "./helpers.js";
import {getConcurrency, getMaxQueueLength, getScreenshotOneAccessKey } from "./config.js";
const axios = require('axios');


const port = process.env.PORT || 8080;
const app = express();

async function capture(req, res) {
    if (!allowedRequest(req.query)) {
        res.status(403).send('Go away please');
        return;
    }
    if (queue.size >= getMaxQueueLength()) {
        res.status(429).send('Maximum queue size reached, try again later');
        return;
    }
    if (queue.pending >= getConcurrency()) {
        console.log('Queueing request...');
    }
    await queue.add(async () => {
        const result = await doCaptureWork(req.query);
        if (result.statusCode === 200) {
            res.status(result.statusCode).type(result.responseType).send(result.buffer);
        } else {
            res.status(result.statusCode).send(result.message);
        }
    });
}
async function screenshotOne (req, res) {
    let screenhotoneAccessKey = getScreenshotOneAccessKey();
    try {
        const screenshotUrl = `https://api.screenshotone.com/take?access_key=${screenhotoneAccessKey}&url=${encodeURIComponent(url)}&full_page=false&viewport_width=1920&viewport_height=1080&device_scale_factor=1&format=jpg&image_quality=80&block_ads=true&block_cookie_banners=true&block_banners_by_heuristics=false&block_trackers=true&delay=0&timeout=60`;
        const response = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching screenshot');
    }
    axios({ method: 'GET', url: `https://api.screenshotone.com/take?access_key=${screenhotoneAccessKey}&url={}&full_page=false&viewport_width=1920&viewport_height=1080&device_scale_factor=1&format=jpg&image_quality=80&block_ads=true&block_cookie_banners=true&block_banners_by_heuristics=false&block_trackers=true&delay=0&timeout=60` })
    .then(function (response) {
        res.status(result.statusCode).type(result.responseType).send(response.buffer);
    }).catch(function (error) {
        console.error(error);
    });
}

async function screenshot(req, res) {
    if (!allowedRequest(req.query)) {
        res.status(403).send('Go away please');
        return;
    }
    if (!req.query.engine || req.query.engine=='pp') return capture(req,res)
    return screenshotOne (req, res)
    
    
}

app.get('/capture', capture);
app.get('/screenshot', screenshot)

if (showResults()) {
    app.get('/', latestCapturePage);
    app.get('/latest', latestCapture);
}

app.listen(port, () => console.log(`listening at port ${port}...`));
