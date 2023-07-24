import { Request, Response } from 'express';
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { bucket, db } from '../firebaseConfig';

// Define the Player interface
interface Player {
  faceImageId: number;
}

// Function to fetch faceImageIds for all matches in the database
async function fetchAllMatchesFaceImageIds() {
  try {
    const upcomingMatchesRef = db.collection('JyotUpcomingMatches');
    const upcomingMatchesSnapshot = await upcomingMatchesRef.get();

    if (upcomingMatchesSnapshot.empty) {
      console.log('No upcoming matches found in the database.');
      return;
    }

    const promises: Promise<number[]>[] = [];

    upcomingMatchesSnapshot.forEach(matchDoc => {
      const matchId = matchDoc.id;
      const promise = fetchFaceImageIds(matchId);
      promises.push(promise);
    });

    const allFaceImageIds: number[][] = await Promise.all(promises);
    console.log('All faceImageIds:', allFaceImageIds.flat());
  } catch (error) {
    console.error('Error fetching matches from the database:', error);
    throw error;
  }
}

// function to fetch faceImageIds from the database for a specific match
async function fetchFaceImageIds(matchId: string): Promise<number[]> {
  try {
    const playersDataRef = db
      .collection('JyotUpcomingMatches')
      .doc(matchId)
      .collection('playersData');

    const faceImageIds: number[] = [];

    // Fetch player data from "team1" subcollection
    const team1Snapshot = await playersDataRef.doc('team1').get();
    const team1Data = team1Snapshot.data();

    if (team1Data && team1Data.players) {
      const team1Players: Player[] = Object.values(team1Data.players);
      team1Players.forEach(player => {
        if (player.faceImageId) {
          faceImageIds.push(player.faceImageId);
        }
      });
    }

    // Fetch player data from "team2" subcollection
    const team2Snapshot = await playersDataRef.doc('team2').get();
    const team2Data = team2Snapshot.data();

    if (team2Data && team2Data.players) {
      const team2Players: Player[] = Object.values(team2Data.players);
      team2Players.forEach(player => {
        if (player.faceImageId) {
          faceImageIds.push(player.faceImageId);
        }
      });
    }

    return faceImageIds;
  } catch (error) {
    console.error('Error fetching faceImageIds from the database:', error);
    throw error;
  }
}

// Function to get matchId from the database
async function getMatchIdFromDatabase(): Promise<string> {
  try {
    const upcomingMatchesRef = db.collection('JyotUpcomingMatches');
    const upcomingMatchesSnapshot = await upcomingMatchesRef.limit(1).get();
    if (upcomingMatchesSnapshot.empty) {
      throw new Error('No upcoming matches found in the database.');
    }

    const matchId = upcomingMatchesSnapshot.docs[0].id;
    return matchId;
  } catch (error) {
    console.error('Error fetching matchId from the database:', error);
    throw error;
  }
}

export async function downloadPlayersImages(req: Request, res: Response) {
  try {
    const matchId: string = await getMatchIdFromDatabase();
    const maxCount = 10; // Set the maximum number of images to download and upload

    const imageIds = await fetchFaceImageIds(matchId);
    await downloadAndSaveImages(imageIds, maxCount);
    res
      .status(200)
      .json({ message: 'Images downloaded and saved successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to download and save images.' });
  }
}

async function downloadAndSaveImages(imageIds: number[], maxCount: number) {
  const options: AxiosRequestConfig = {
    method: 'GET',
    params: { p: 'det', d: 'high' },
    headers: {
      'X-RapidAPI-Key': 'eda7dcfeb4mshd896c7edbdad4fdp13e213jsn1127558118a2',
      'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com',
    },
    responseType: 'arraybuffer',
  };

  const maxRetries = 3; // Maximum number of retries before giving up
  let retries = 0;
  let delayMs = 100; // Initial delay between retries in milliseconds

  const imageFolderPath = path.join(__dirname, '../player-images');
  let downloadCount = 0;
  let uploadCount = 0;
  for (const imageId of imageIds) {
    const imagePath = path.join(imageFolderPath, `${imageId}.jpg`);

    if (fs.existsSync(imagePath)) {
      console.log(
        `Image with ID ${imageId} already exists in the folder. Skipping download.`
      );
      continue; // Skip download for existing image
    }

    while (retries < maxRetries) {
      try {
        const response: AxiosResponse = await axios.request({
          ...options,
          url: `https://cricbuzz-cricket.p.rapidapi.com/img/v1/i1/c${imageId}/i.jpg`,
        });

        fs.writeFileSync(imagePath, response.data, 'binary');
        console.log(`Image with ID ${imageId} downloaded and saved.`);
        downloadCount++;

        // Upload the image to Firebase Storage
        await uploadImageToFirebase(
          imagePath,
          `Jyot_Players_images/Players-Images/${imageId}.jpg`
        );
        uploadCount++;

        // Stop the process if the desired number of images (maxCount) is reached
        if (downloadCount >= maxCount && uploadCount >= maxCount) {
          console.log(
            'Maximum image download and upload limit reached. Stopping process.'
          );
          break;
        }
      } catch (error) {
        console.error(
          `Error occurred while downloading image with ID ${imageId}:`,
          error
        );

        // Implement exponential backoff
        retries++;
        delayMs *= 2;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Reset retries and delay for the next image download
    retries = 0;
    delayMs = 100;
  }

  console.log('All images downloaded and saved successfully.');
}

// Call the function to fetch faceImageIds for a specific match
async function processMatchImages(matchId: string, maxCount: number) {
  try {
    const imageIds = await fetchFaceImageIds(matchId);
    await downloadAndSaveImages(imageIds, maxCount);
  } catch (error) {
    console.error('Error processing match images:', error);
  }
}

// Call the function to process images for all matches
// async function processAllMatchesImages(maxCount: number) {
//   try {
//     const upcomingMatchesRef = db.collection('JyotUpcomingMatches');
//     const upcomingMatchesSnapshot = await upcomingMatchesRef.get();

//     if (upcomingMatchesSnapshot.empty) {
//       console.log('No upcoming matches found in the database.');
//       return;
//     }

//     upcomingMatchesSnapshot.forEach(matchDoc => {
//       const matchId = matchDoc.id;
//       processMatchImages(matchId, maxCount);
//     });
//   } catch (error) {
//     console.error('Error processing all matches images:', error);
//   }
// }
// processAllMatchesImages(10);

// Function to upload an image to Firebase Storage
async function uploadImageToFirebase(
  localImagePath: string,
  remoteImagePath: string
) {
  try {
    await bucket.upload(localImagePath, {
      destination: remoteImagePath,
      metadata: {
        contentType: 'image/jpeg', // Change this based on the image type, if necessary
      },
    });

    console.log(`Image ${remoteImagePath} uploaded to Firebase Storage.`);
  } catch (error) {
    console.error('Error uploading image to Firebase Storage:', error);
    throw error;
  }
}
