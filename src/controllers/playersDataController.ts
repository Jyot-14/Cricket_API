import { Request, Response } from 'express';
import axios from 'axios';
import { db } from '../firebaseConfig';

export async function addPlayersData(req: Request, res: Response) {
  // Add Players Data
  const upcomingMatchesCollection = db.collection('JyotUpcomingMatches');

  try {
    // Get the current date
    const currentDate = new Date().getTime();

    // Sort the data by startDate
    const sortedUpcomingMatchesSnapshot = await upcomingMatchesCollection
      .where('startDate', '>=', currentDate)
      .orderBy('startDate', 'asc')
      .limit(10)
      .get();

    const upcomingMatchesData = sortedUpcomingMatchesSnapshot.docs.map(doc =>
      doc.data()
    );

    const upcomingMatchesWithPlayers = [];

    for (const match of upcomingMatchesData) {
      const { matchId, team1, team2 } = match;
      console.log(`Match ID: ${matchId}`);
      console.log(`Team 1 ID: ${team1.teamId}`);
      console.log(`Team 2 ID: ${team2.teamId}`);

      const team1PlayersResponse = await axios.get(
        `https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/${matchId}/team/${team1.teamId}`,
        {
          headers: {
            'X-RapidAPI-Key':
              'fb471303b6msh88e5e629a4cb13bp108267jsn885de5257b6b',
            'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com',
          },
        }
      );

      const team2PlayersResponse = await axios.get(
        `https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/${matchId}/team/${team2.teamId}`,
        {
          headers: {
            'X-RapidAPI-Key':
              '7231dba0damsh3276c0ade8af22ap18ec03jsne2acc9d643d0',
            'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com',
          },
        }
      );

      // Check if the required data is available in the response before proceeding
      const team1Players = team1PlayersResponse.data?.players;
      const team2Players = team2PlayersResponse.data?.players;

      if (!team1Players || !team2Players) {
        console.log(`No player data found for match ${matchId}`);
        continue; // Skip to the next match
      }

      // Function to add imageURL field to each player data
      function addImageURLToPlayers(
        players: { faceImageId: number }[],
        teamImageId: number
      ) {
        // Assuming 'players' is an array of player objects
        return players.map((player: { faceImageId: number }) => ({
          ...player,
          imageURL: `https://firebasestorage.googleapis.com/v0/b/my11-6b9a0.appspot.com/o/Jyot_Players_images%2FPlayers-Images%2F${player.faceImageId}.jpg?alt=media`,
        }));
      }
      // Perform checks to prevent 'concat' on undefined arrays
      const team1PlayingXI = team1Players['playing XI'] || [];
      const team1Bench = team1Players.bench || [];
      const team1Squad = team1Players['Squad'] || [];
      const team1AllPlayers = team1Squad || team1PlayingXI.concat(team1Bench);

      const team2PlayingXI = team2Players['playing XI'] || [];
      const team2Bench = team2Players.bench || [];
      const team2Squad = team2Players['Squad'] || [];
      const team2AllPlayers = team2Squad || team2PlayingXI.concat(team2Bench);

      const team1PlayersWithImageURL = addImageURLToPlayers(
        team1AllPlayers,
        team1.imageId
      );
      const team2PlayersWithImageURL = addImageURLToPlayers(
        team2AllPlayers,
        team2.imageId
      );
      upcomingMatchesWithPlayers.push({
        matchId,
        team1: {
          ...team1,
          players: team1PlayersWithImageURL,
        },
        team2: {
          ...team2,
          players: team2PlayersWithImageURL,
        },
      });

      // Store the players' data in Firestore under the "playersData" sub-collection for the current match
      await db
        .collection('JyotUpcomingMatches')
        .doc(String(matchId))
        .collection('playersData')
        .doc('team1')
        .set({ players: team1PlayersWithImageURL });

      console.log(`Stored team1 players data for match ${matchId}`);

      await db
        .collection('JyotUpcomingMatches')
        .doc(String(matchId))
        .collection('playersData')
        .doc('team2')
        .set({ players: team2PlayersWithImageURL });

      console.log(`Stored team2 players data for match ${matchId}`);
    }

    res.json(upcomingMatchesWithPlayers);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}
