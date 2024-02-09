import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { SKDBDevConsoleProvider } from "skdb-react";
import { skdbDevServerDb, createLocalDbConnectedTo } from "skdb-dev";

async function init() {
  const remoteDb = await skdbDevServerDb("todo-app", "localhost", 3586);

  await remoteDb.schema(
    "CREATE TABLE tasks (id TEXT PRIMARY KEY, name TEXT, complete INTEGER, skdb_access TEXT);",
    "CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT, skdb_access TEXT);",
    "CREATE TABLE tasks_tags (task_id TEXT, tag_id TEXT, skdb_access TEXT);",
    "CREATE TABLE likes (task_id TEXT, skdb_author TEXT, skdb_access TEXT);",
    `CREATE VIRTUAL VIEW unique_likes AS
       SELECT task_id, COUNT(*) as n FROM
         ( SELECT task_id, skdb_author FROM likes GROUP BY task_id, skdb_author )
       GROUP BY task_id;`,
  );

  const connect = async (userID: string = "root") => {
    const localDb = await createLocalDbConnectedTo(remoteDb, userID);

    await localDb.mirror(
      {
        table: "tasks",
        expectedColumns:
          "(id TEXT PRIMARY KEY, name TEXT, complete INTEGER, skdb_access TEXT)",
      },
      {
        table: "tags",
        expectedColumns: "(id TEXT PRIMARY KEY, name TEXT, skdb_access TEXT)",
      },
      {
        table: "tasks_tags",
        expectedColumns: "(task_id TEXT, tag_id TEXT, skdb_access TEXT)",
      },
      {
        table: "likes",
        expectedColumns: "(task_id TEXT, skdb_author TEXT, skdb_access TEXT)",
      },
      { table: "unique_likes", expectedColumns: "(task_id TEXT, n INTEGER)" },
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
