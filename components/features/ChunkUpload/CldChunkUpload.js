/**
 * Main component to manage the ChunkUpload through Axios
 *
 */

import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  SafeAreaView,
  Button,
  StatusBar,
} from "react-native";
import DocumentPicker from "react-native-document-picker";

import ChunkUpload from "./ChunkUpload";
import Axios from "axios";

var icounter = 0;

upload = (file, next, retry, unlink) => {
  //const [fileResponse, setFileResponse] = useState();
  const body = new FormData();

  console.log("body: ", body);

  console.log("X-Unique-Upload-Id: ", file.headers["X-Unique-Upload-Id"]);
  console.log("Content-Range: ", file.headers["Content-Range"]);

  console.log("x-chunk-size: ", file.headers["x-chunk-size"]);
  console.log("x-file-size: ", file.headers["x-file-size"]);

  body.append("file", file.blob); // param name
  body.append("cloud_name", "epasos");
  body.append("upload_preset", "testing");
  body.append("public_id", "reactnativetest");

  Axios.post("https://api.cloudinary.com/v1_1/epasos/auto/upload", body, {
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
          console.log(response.data);
          if (response.data["done"].localeCompare("false") == 0) {
            console.log("Continue for next...");
            //next();
          } else {
            console.log("Processing completed...");
          }
          console.log("Response.done: ", response.data["done"]);
          break;

        // 🕗 still uploading...
        case 201:
          console.log(`${response.data.progress}% uploaded...`);
          next();
          break;
      }
    })
    .catch((error) => {
      console.log("catch (error.response) .... ");

      if (error.response) {
        console.log(error.response);

        if ([400, 404, 415, 500, 501].includes(error.response.status)) {
          console.log(error.response.status, "Failed to upload the chunk.");

          unlink(file.path);
        } else if (error.response.status === 422) {
          console.log("Validation Error", error.response.data);

          unlink(file.path);
        } else {
          console.log("Re-uploading the chunk...");
          //retry();
        }
      } else {
        console.log("Upload processing completed...");
        //console.log(error);
        //retry();
        //next();
      }
    });
};

const CldChunkUpload = () => {
  const [fileResponse, setFileResponse] = useState();

  var XUniqueUploadId = +new Date();

  processFile = async (fileData) => {
    var file = fileData;

    console.log("processFile: ", file);

    const chunk = new ChunkUpload({
      path: file.uri, // Path to the file
      size: 20000000, // Chunk size (must be multiples of 3)
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

      //console.log(response);
      setFileResponse(response);
      console.log("handleDocumentSelection: ", fileResponse);

      processFile(fileResponse);
    } catch (err) {
      console.warn(err);
    }
  }, []);

  const handleProcessFile = () => {
    console.log("Process file upload...");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={"dark-content"} />

      <Button title="Select 📑" onPress={handleDocumentSelection} />
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
});

export default CldChunkUpload;
