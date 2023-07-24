import { Request, Response } from 'express';
import axios from 'axios';
import { db } from '../firebaseConfig';

export async function getUpcomingMatches(req: Request, res: Response) {
  // Upcoming Matches Data
  try {
    const response = await axios.get(
      'https://cricbuzz-cricket.p.rapidapi.com/matches/v1/upcoming',
      {
        headers: {
          'X-RapidAPI-Key':
            '569fb7e383msh80c3b0da2d31424p154ea2jsn8e82cd449388',
          'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com',
        },
      }
    );

    const rawData = response.data;

    // Filter and update the data
    const updatedData = rawData.typeMatches.flatMap((typeMatch: any) =>
      typeMatch.seriesMatches
        .flatMap((seriesMatch: any) =>
          seriesMatch.seriesAdWrapper ? seriesMatch.seriesAdWrapper.matches : []
        )
        .filter(
          (match: any) =>
            match.matchInfo.matchFormat.toLowerCase() === 'odi' ||
            match.matchInfo.matchFormat.toLowerCase() === 't20' // Include T20 matches
        )
        .map((match: any) => {
          const { matchInfo } = match;
          return {
            ...matchInfo,
            team1: {
              ...matchInfo.team1,
              imageURL: `https://firebasestorage.googleapis.com/v0/b/my11-6b9a0.appspot.com/o/Jyot_Players_images%2FTeams-Images%2F${matchInfo.team1.imageId}.jpg?alt=media`,
            },
            team2: {
              ...matchInfo.team2,
              imageURL: `https://firebasestorage.googleapis.com/v0/b/my11-6b9a0.appspot.com/o/Jyot_Players_images%2FTeams-Images%2F${matchInfo.team2.imageId}.jpg?alt=media`,
            },
            startDate: parseInt(matchInfo.startDate),
            endDate: parseInt(matchInfo.endDate),
            seriesStartDt: parseInt(matchInfo.seriesStartDt),
            seriesEndDt: parseInt(matchInfo.seriesEndDt),
          };
        })
    );

    // Create a Firestore batch
    const batch = db.batch();

    // Iterate through the filtered data and create new documents for each match
    updatedData.forEach((match: any) => {
      const matchId = match.matchId;
      const matchRef = db
        .collection('JyotUpcomingMatches')
        .doc(matchId.toString());
      batch.set(matchRef, match);
      console.log('Document created with ID: ', matchId);
    });

    // Commit the batch to Firestore
    await batch.commit();

    res.json(updatedData);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}
