import { Request, Response } from 'express';
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { bucket } from '../firebaseConfig';

// Download team images and upload
export async function downloadImages(req: Request, res: Response) {
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

    // Filter the data
    const filteredData = rawData.typeMatches.flatMap((typeMatch: any) =>
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
            startDate: parseInt(matchInfo.startDate),
            endDate: parseInt(matchInfo.endDate),
            seriesStartDt: parseInt(matchInfo.seriesStartDt),
            seriesEndDt: parseInt(matchInfo.seriesEndDt),
          };
        })
    );

    // Extract imageIds from the filteredData for both team1 and team2
    const imageIds: number[] = [];
    filteredData.forEach((match: any) => {
      if (match.team1 && match.team1.imageId) {
        imageIds.push(match.team1.imageId);
      }
      if (match.team2 && match.team2.imageId) {
        imageIds.push(match.team2.imageId);
      }
    });

    // Download and save all the images to a folder
    await downloadAndSaveImages(imageIds);

    res.json(filteredData);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching data.' });
  }
}

async function downloadAndSaveImages(imageIds: number[]) {
  const options: AxiosRequestConfig = {
    method: 'GET',
    params: { p: 'det', d: 'high' },
    headers: {
      'X-RapidAPI-Key': '38f56d0641msh9d39d2b06fa0a0bp159350jsn9a5cb3d2ec68',
      'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com',
    },
    responseType: 'arraybuffer',
  };

  const maxRetries = 3; // Maximum number of retries before giving up
  let retries = 0;
  let delayMs = 100; // Initial delay between retries in milliseconds

  const imageFolderPath = path.join(__dirname, '../team-images');

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

        // Upload the image to Firebase Storage
        await uploadImageToFirebase(imagePath, `${imageId}.jpg`);

        break; // Success, break out of the retry loop
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

async function uploadImageToFirebase(
  localImagePath: string,
  remoteImagePath: string
) {
  // Upload the image to Firebase Storage
  await bucket.upload(localImagePath, {
    destination: `Jyot_Players_images/Teams-Images/${remoteImagePath}`,
    metadata: {
      contentType: 'image/jpeg', // Change this based on the image type, if necessary
    },
  });

  console.log(`Image ${remoteImagePath} uploaded to Firebase Storage.`);
}
