/**
 * Main component to manage the ChunkUpload through Axios
 * Sample large file can be downloaded from:
 */

import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  SafeAreaView,
  Button,
  StatusBar,
  View,
} from "react-native";
import DocumentPicker from "react-native-document-picker";

import ChunkUpload from "./ChunkUpload";
import Axios from "axios";

var icounter = 0;

var gblUploadResponse = "...";

const CldChunkUpload = () => {
  const [fileResponse, setFileResponse] = useState();
  const [uploadResponse, setUploadResponse] = useState();

  var XUniqueUploadId = +new Date();

  upload = (file, next, retry, unlink) => {
    const CLOUD_NAME = "epasos";
    const UPLOAD_PRESET = "testing";

    const POST_URL =
      "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/auto/upload";

    const body = new FormData();

    console.log("body: ", body);

    console.log("X-Unique-Upload-Id: ", file.headers["X-Unique-Upload-Id"]);
    console.log("Content-Range: ", file.headers["Content-Range"]);
    console.log("x-chunk-size: ", file.headers["x-chunk-size"]);
    console.log("x-file-size: ", file.headers["x-file-size"]);

    body.append("file", file.blob); // param name
    body.append("cloud_name", "epasos");
    body.append("upload_preset", "testing");

    Axios.post(POST_URL, body, {
      headers: {
        "Content-Type": "multipart/form-data",
        "X-Unique-Upload-Id": file.headers["X-Unique-Upload-Id"],
        "Content-Range": file.headers["Content-Range"],
      },
    })
      .then((response) => {
        console.log("Then (response) .... ");

        switch (response.status) {
          // ✅ done
          case 200:
            if (response.data.done === false) {
              // Still uploading ...
              console.log("Response done = false - continue chunk upload ...");
              console.log(`${response.data.progress}% uploaded...`);
              gblUploadResponse = JSON.stringify(response.data);
              next();
            } else {
              gblUploadResponse = JSON.stringify(response);
              console.log("Response done = true ... completed!");
            }

            setUploadResponse(gblUploadResponse);
            break;
        }
      })
      .catch((error) => {
        console.log("catch (error.response) .... ");

        if (error.response) {
          gblUploadResponse = JSON.stringify(error.response);

          if ([400, 404, 415, 500, 501].includes(error.response.status)) {
            console.log(error.response.status, "Failed to upload the chunk.");
            unlink(file.path);
          } else if (error.response.status === 422) {
            console.log("Validation Error", error.response.data);
            unlink(file.path);
          } else {
            console.log("Re-uploading the chunk...");
            retry();
          }
        } else {
          console.log("Uncaught exception...");

          unlink(file.path);

          gblUploadResponse = "Uncaught exception...";
        }

        setUploadResponse(gblUploadResponse);
      });
  };

  processFile = async (fileData) => {
    var file = fileData;

    console.log("Processing the file: ", file);

    const chunk = new ChunkUpload({
      path: file.uri, // Path to the file
      size: 10000000, // Chunk size (must be multiples of 3)
      fileName: file.name, // Original file name
      fileSize: file.size, // Original file size
      XUniqueUploadId: XUniqueUploadId, // Cld Unique Upload ID

      // Errors
      onFetchBlobError: (e) => console.log(e),
      onWriteFileError: (e) => console.log(e),
    });

    chunk.digIn(this.upload.bind(this));
  };

  const handleDocumentSelection = useCallback(async () => {
    try {
      // Select file ...
      const response = await DocumentPicker.pickSingle({
        presentationStyle: "fullScreen",
      });

      setUploadResponse("Processing...");

      setFileResponse(response);

      console.log("handleDocumentSelection: ", fileResponse);

      processFile(fileResponse);
    } catch (err) {
      console.warn(err);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Button title="Browse..." onPress={handleDocumentSelection} />
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>{uploadResponse}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadresponse: {
    fontSize: 10,
  },
});

export default CldChunkUpload;
