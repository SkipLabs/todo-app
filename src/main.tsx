import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { SKDBDevConsoleProvider } from "skdb-react";
import { skdbDevServerDb, createLocalDbConnectedTo } from "skdb-dev";

async function init() {
  const remoteDb = await skdbDevServerDb("todo-app", "localhost", 3586);

  await remoteDb.schema(
    "CREATE TABLE tasks (id STRING PRIMARY KEY, name STRING, complete INTEGER, skdb_access STRING);",
    "CREATE TABLE tags (id STRING PRIMARY KEY, name STRING, skdb_access STRING);",
    "CREATE TABLE tasks_tags (task_id STRING, tag_id STRING, skdb_access STRING);",
    "CREATE TABLE likes (task_id STRING, skdb_author STRING, skdb_access STRING);",
    `CREATE VIRTUAL VIEW unique_likes AS
       SELECT task_id, COUNT(*) as n FROM
         ( SELECT task_id, skdb_author FROM likes GROUP BY task_id, skdb_author )
       GROUP BY task_id;`,
  );

  const connect = async (userID: string = "root") => {
    const localDb = await createLocalDbConnectedTo(remoteDb, userID);

    await localDb.mirror(
      "tasks",
      "tags",
      "tasks_tags",
      "likes",
      "unique_likes",
    );

    return localDb;
  };

  return connect;
}

init().then((connect) => {
  connect().then((skdb) => {
    window.skdb_as_root = skdb;
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <SKDBDevConsoleProvider skdbAsRoot={skdb} create={connect}>
          <App />
        </SKDBDevConsoleProvider>
      </React.StrictMode>,
    );
  });
});
