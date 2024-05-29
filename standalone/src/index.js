import express from 'express';
import {doCaptureWork, latestCapture, latestCapturePage, queue, showResults, allowedRequest, parseSizeString} from "./helpers.js";
import {getConcurrency, getMaxQueueLength, getScreenshotOneAccessKey } from "./config.js";
import axios from 'axios';


const port = process.env.PORT || 8080;
const app = express();

async function capture(req, res) {
    if (!allowedRequest(req.query)) {
        res.status(403).send('Go away please');
        return;
    }
    req.query.url = req.query.url.replaceAll("~","&")
    const size = parseSizeString(req.query.size);
    if (size != null) {
        req.query.width = size.width;
        req.query.height = size.height;
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
    const screenshotoneAccessKey = getScreenshotOneAccessKey();

    let url = req.query.url;
    if (typeof url !== 'string' || url.length === 0) {
        return res.status(400).send('Missing URL parameter');
    }
    url = url.replaceAll("~","&")
    const size = parseSizeString(req.query.size || '950,350');
    const format = req.query.format || 'png';
    const delay = req.query.delay || 5;
    const timeout = req.query.timout || 60;
    if (size == null) {
        return res.status(400).send('Invalid size parameter');
    }

    
    try {
        const screenshotUrl = `https://api.screenshotone.com/take?access_key=${screenshotoneAccessKey}&url=${encodeURIComponent(url)}&full_page=false&viewport_width=${size.width}&viewport_height=${size.height}&device_scale_factor=1&format=${format}&image_quality=80&block_ads=true&block_cookie_banners=true&block_banners_by_heuristics=false&block_trackers=true&delay=${delay}&timeout=${timeout}`;
        console.log({screenshotUrl})
        const response = await axios.get(screenshotUrl, { responseType: 'stream' });        
        res.setHeader('Content-Type', `image/${format}`);
        return response.data.pipe(res);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching screenshot');
    }
}

async function screenshot(req, res) {
    if (!allowedRequest(req.query)) {
        res.status(403).send('Go away please');
        return;
    }
    if (req.query.engine=='pp') return capture(req,res)
    return screenshotOne (req, res)
}

app.get('/capture', capture);
app.get('/screenshot', screenshot)

if (showResults()) {
    app.get('/', latestCapturePage);
    app.get('/latest', latestCapture);
}

app.listen(port, () => console.log(`listening at port ${port}...`));
