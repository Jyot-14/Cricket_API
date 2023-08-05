import express from 'express';
import upcomingMatchesRouter from './routes/upcomingMatches';
import playersDataRouter from './routes/playersData';
import downloadImagesRouter from './routes/teamImagesdownload';
import downloadPlayersImagesRouter from './routes/playersImageDownload';
import scoreCardRouter from './routes/scoreCard';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = 4000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

app.use('/upcomingMatches', upcomingMatchesRouter);
app.use('/teamImageDownload', downloadImagesRouter);
app.use('/addPlayersData', playersDataRouter);
app.use('/downloadPlayersImages', downloadPlayersImagesRouter);
app.use('/scoreCard', scoreCardRouter);
