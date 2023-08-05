import axios from 'axios';
import { db } from '../firebaseConfig';
import { calculatePoints } from '../utils/calculatePoints';

// Function to store player points in Firestore
async function storePlayerPoints(
  userId: string,
  playerId: number,
  points: number
) {
  try {
    const userTeamsRef = db
      .collection('JyotUpcomingMatches')
      .doc('70856')
      .collection('usersTeams')
      .doc(userId);

    // Update points for the player inside the playersData map
    await userTeamsRef.set(
      {
        [`playersData.${playerId}`]: points,
      },
      { merge: true }
    );
    console.log(`Debugging storePlayerPoints:`);
    console.log(`Player ID: ${playerId}`);
    console.log(`Points: ${points}`);

    console.log(`Points for Player ID ${playerId} stored successfully.`);
  } catch (error) {
    console.error(`Error storing points for Player ID ${playerId}:`, error);
  }
}

// Main function to process scorecard and calculate points
async function processScorecard(userId: string, scorecardData: any) {
  const scorecard = scorecardData.scoreCard[0];

  const batTeamDetails = scorecard.batTeamDetails;
  const bowlTeamDetails = scorecard.bowlTeamDetails;

  if (
    !batTeamDetails ||
    !bowlTeamDetails ||
    Object.keys(batTeamDetails).length === 0 ||
    Object.keys(bowlTeamDetails).length === 0
  ) {
    console.error(
      'Invalid scorecard data: batTeamDetails or bowlTeamDetails is missing or empty.'
    );
    return;
  }

  for (const batsmanId in batTeamDetails.batsmenData) {
    const batsmanData = batTeamDetails.batsmenData[batsmanId];
    const playerId = batsmanData.batId;
    const playerPoints = calculatePoints(batsmanData);
    await storePlayerPoints(userId, playerId, playerPoints);
  }

  for (const bowlerId in bowlTeamDetails.bowlersData) {
    const bowlerData = bowlTeamDetails.bowlersData[bowlerId];
    const playerId = bowlerData.bowlerId;
    const playerPoints = calculatePoints(bowlerData);
    await storePlayerPoints(userId, playerId, playerPoints);
  }
}

// Fetch the scorecard data from the provided URL
export const fetchScorecard = async () => {
  try {
    const response = await axios.get(
      'https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/70856/scard',
      {
        headers: {
          'X-RapidAPI-Key':
            '569fb7e383msh80c3b0da2d31424p154ea2jsn8e82cd449388',
          'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com',
        },
      }
    );

    // Process the fetched scorecard data
    await processScorecard('uId1', response.data); // Pass the userId as 'uId1'
  } catch (error) {
    console.error('Error fetching or processing scorecard:', error);
  }
};
