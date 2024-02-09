import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { SKDBProvider } from "skdb-react";
import { skdbDevServerDb, createLocalDbConnectedTo } from "skdb-dev";

async function init() {
  const remoteDb = await skdbDevServerDb("todo-app", "localhost", 3586);

  await remoteDb.schema(
    "CREATE TABLE tasks (id TEXT PRIMARY KEY, name TEXT, complete INTEGER, skdb_access TEXT);",
  );

  const connect = async (userID: string = "root") => {
    const localDb = await createLocalDbConnectedTo(remoteDb, userID);

    await localDb.mirror({
      table: "tasks",
      expectedColumns:
        "(id TEXT PRIMARY KEY, name TEXT, complete INTEGER, skdb_access TEXT)",
    });

    return localDb;
  };

  return connect;
}

init().then((connect) => {
  connect().then((skdb) => {
    window.skdb = skdb;
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <SKDBProvider skdb={skdb}>
          <App />
        </SKDBProvider>
      </React.StrictMode>,
    );
  });
});
