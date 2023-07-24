import { Request, Response } from 'express';
import axios from 'axios';
import { db } from '../firebaseConfig';

export async function addPlayersData(req: Request, res: Response) {
  // Add Players Data
  const upcomingMatchesCollection = db.collection('JyotUpcomingMatches');

  try {
    // Sort the data by startDate
    const sortedUpcomingMatchesSnapshot = await upcomingMatchesCollection
      .orderBy('startDate', 'asc')
      .limit(20)
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
              'd65111930dmshb4f3b731af3cc2ap184e04jsn006d2eae17a9',
            'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com',
          },
        }
      );

      const team2PlayersResponse = await axios.get(
        `https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/${matchId}/team/${team2.teamId}`,
        {
          headers: {
            'X-RapidAPI-Key':
              'fb471303b6msh88e5e629a4cb13bp108267jsn885de5257b6b',
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

      const team1AllPlayers = team1Players['playing XI'].concat(
        team1Players.bench || []
      );
      const team2AllPlayers = team2Players['playing XI'].concat(
        team2Players.bench || []
      );

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
