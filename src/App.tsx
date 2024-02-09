import { useState, useMemo } from "react";
import { useSKDB, useQuery } from "skdb-react";
import { SKDB } from "skdb";
import "./App.css";
import logo from "./assets/sk.svg";
import { AppBar, Box, Toolbar, IconButton, Typography } from "@mui/material";
import { InputBase, Badge, Tabs, Tab, TextField, Paper } from "@mui/material";
import { Switch, Table, TableBody, TableCell, TableRow } from "@mui/material";
import { TableContainer, TablePagination } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HeartIcon from "@mui/icons-material/FavoriteBorder";
import FullHeartIcon from "@mui/icons-material/Favorite";
import TagIcon from "@mui/icons-material/Tag";
import VisibilityIcon from "@mui/icons-material/Visibility";
import MenuIcon from "@mui/icons-material/Menu";
import { Drawer, Divider, Button, MenuItem, Menu } from "@mui/material";
import { Chip, Checkbox } from "@mui/material";

type Option = {
  filter: string;
  onFilter: (filter: string) => void;
  page: number;
  onPage: (page: number) => void;
  rowsPerPage: number;
  onRowsPerPage: (page: number) => void;
};

interface Task {
  id: string;
  name: string;
  complete: number;
}

interface Tag {
  id: string;
  name: string;
}

interface User {
  userID: string;
}

function TasksTable({
  completed,
  option,
}: {
  completed: boolean;
  option: Option;
}) {
  const handleChangePage = (_event: unknown, newPage: number) => {
    option.onPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    option.onRowsPerPage(parseInt(event.target.value, 10));
    option.onPage(0);
  };

  const params: { filt: string; completed: number; end?: number } = {
    filt: "%" + option.filter + "%",
    completed: completed ? 1 : 0,
  };
  const counts = useQuery(
    "SELECT count(*) AS n FROM tasks WHERE name LIKE @filt AND complete = @completed;",
    params,
  );

  const count = counts.length ? counts[0].n : 0;
  let page = Math.max(
    Math.min(option.page, Math.floor((count - 1) / option.rowsPerPage)),
    0,
  );
  const start = page * option.rowsPerPage;
  params.end = (page + 1) * option.rowsPerPage;
  const tasks = (
    useQuery(
      "SELECT * FROM tasks WHERE name LIKE @filt AND complete = @completed ORDER BY id DESC LIMIT @end;",
      params,
    ) as Array<Task>
  ).slice(start);
  if (page != option.page) {
    setTimeout(() => option.onPage(page), 0);
  }
  return (
    <Paper>
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableBody>
            {tasks.map((t: Task) => (
              <TaskRow task={t} key={t.id} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="footer"
        count={count}
        rowsPerPage={option.rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}

function TaskRow({ task }: { task: Task }) {
  const skdb = useSKDB();

  const isComplete = task.complete === 1;

  const del = (id: string) => {
    skdb.exec("DELETE FROM tasks WHERE id = @id;", { id });
  };

  const complete = (id: string, complete: boolean) => {
    const completed = complete ? 1 : 0;
    skdb.exec("UPDATE tasks SET complete = @completed WHERE id = @id;", {
      id,
      completed,
    });
  };
  return (
    <TableRow className="task">
      <TableCell>
        <Tags task={task} />
        <Typography noWrap component="div">
          {task.name}
        </Typography>
      </TableCell>
      <TableCell className="min">
        <TagDropdown task={task} />
      </TableCell>
      <TableCell className="min">
        <Like taskId={task.id} />
      </TableCell>
      <TableCell className="min">
        <IconButton title="Delete" onClick={(_e) => del(task.id)}>
          <DeleteIcon />
        </IconButton>
      </TableCell>
      <TableCell className="min">
        <Switch
          size="small"
          title="Completed?"
          checked={isComplete}
          onChange={(e) => complete(task.id, e.target.checked)}
        />
      </TableCell>
    </TableRow>
  );
}

function AddTasks() {
  const skdb = useSKDB();
  const [taskName, setTaskName] = useState("");
  const [accessList, setAccessList] = useState([]);
  const isEmpty = useMemo(() => taskName.length == 0, [taskName]);

  const handleTaskName = (e: any) => {
    setTaskName(e.target.value);
  };

  const addTask = async (name: string) => {
    if (isEmpty) {
      return;
    }
    const access_group = await createGroup(skdb, accessList);
    skdb.exec(
      "INSERT INTO tasks (name, complete, skdb_access) VALUES (@name, 0, @access_group);",
      { name, access_group },
    );
    setTaskName("");
  };

  // 13 is keycode for enter
  const onKeyDown = ({ keyCode }: { keyCode: number }) => {
    if (keyCode == 13) addTask(taskName);
  };

  return (
    <Box className="new">
      <TextField
        placeholder="Enter the new task name"
        label="Task name"
        variant="standard"
        onChange={handleTaskName}
        value={taskName}
        onKeyDown={onKeyDown}
      />
      <VisibilityDropdown {...{ accessList, setAccessList }} />
      <IconButton
        disabled={isEmpty}
        title="Add Task"
        onClick={(_e) => addTask(taskName)}
      >
        <AddIcon />
      </IconButton>
    </Box>
  );
}

function Body(params: { option: Option }) {
  const option = params.option;
  const [value, setCurrentTab] = useState("uncompleted");
  const counts = useQuery(
    "SELECT complete, count(*) AS n FROM tasks GROUP BY complete;",
  );

  let completed = 0;
  let uncompleted = 0;

  for (const summary of counts) {
    if (summary.complete === 1) {
      completed = summary.n;
    } else {
      uncompleted = summary.n;
    }
  }

  const handleTabChange = (_e: any, value: string) => {
    setCurrentTab(value);
  };
  return (
    <Box className="app-body" component="main">
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          aria-label="TODO TABS"
          variant="fullWidth"
          onChange={handleTabChange}
        >
          <Tab
            value="uncompleted"
            label={
              <Badge badgeContent={uncompleted} color="success">
                Todo
              </Badge>
            }
          />
          <Tab
            value="completed"
            label={
              <Badge badgeContent={completed} color="warning">
                Done
              </Badge>
            }
          />
        </Tabs>
      </Box>
      {value === "uncompleted" && (
        <div className="todo">
          <AddTasks />
          <TasksTable completed={false} option={option} />
        </div>
      )}
      {value === "completed" && (
        <div className="done">
          <TasksTable completed={true} option={option} />
        </div>
      )}
    </Box>
  );
}

function Header({
  text,
  onChange,
  onPage,
  handleDrawerToggle,
}: {
  text: string;
  onChange: (text: string) => void;
  onPage: (page: number) => void;
  handleDrawerToggle: () => void;
}) {
  const handleFilter = (e: any) => {
    onChange(e.target.value);
    onPage(0);
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <img src={logo} />
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            TODO APP
          </Typography>
          <div className="search">
            <div className="icon">
              <SearchIcon />
            </div>
            <InputBase
              className="filter"
              placeholder="Search…"
              value={text}
              onChange={handleFilter}
            />
          </div>
        </Toolbar>
      </AppBar>
    </Box>
  );
}

function App() {
  const [filterText, setFilterText] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  //
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const option: Option = {
    filter: filterText,
    onFilter: setFilterText,
    page: page,
    onPage: setPage,
    rowsPerPage: rowsPerPage,
    onRowsPerPage: setRowsPerPage,
  };
  return (
    <>
      <div className="app">
        <Header
          text={filterText}
          onChange={setFilterText}
          onPage={setPage}
          handleDrawerToggle={handleDrawerToggle}
        />
        <Body option={option} />
        <TagDrawer
          mobileOpen={mobileOpen}
          handleDrawerToggle={handleDrawerToggle}
        />
      </div>
    </>
  );
}

/************** TAGS ****************/

function TagDrawer({
  mobileOpen,
  handleDrawerToggle,
}: {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}) {
  const drawer = (
    <div>
      <AddTags />
      <Divider />
      <TagsList />
    </div>
  );
  return (
    <Box component="nav" className="tags">
      <Drawer
        variant="temporary"
        className="tags-list temp-list"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        sx={{ position: "relative" }}
      >
        {drawer}
      </Drawer>
      <Drawer variant="permanent" className="tags-list perm-list" open>
        {drawer}
      </Drawer>
    </Box>
  );
}

function AddTags() {
  const skdb = useSKDB();
  const [tagName, setTagName] = useState("");
  const [accessList, setAccessList] = useState([]);
  const isEmpty = useMemo(() => tagName.length == 0, [tagName]);

  const handleTagName = (e: any) => {
    setTagName(e.target.value);
  };
  const addTag = async (name: string) => {
    if (isEmpty) {
      return;
    }
    const access_group = await createGroup(skdb, accessList);
    skdb.exec(
      "INSERT INTO tags (name, skdb_access) VALUES (@name, @access_group);",
      { name, access_group },
    );
    setTagName("");
  };

  // 13 is keycode for enter
  const onKeyDown = ({ keyCode }: { keyCode: number }) => {
    if (keyCode == 13) addTag(tagName);
  };
  return (
    <Box className="new">
      <TextField
        placeholder="Enter the new tag name"
        label="Tag name"
        variant="standard"
        onChange={handleTagName}
        value={tagName}
        onKeyDown={onKeyDown}
      />
      <VisibilityDropdown {...{ accessList, setAccessList }} />
      <IconButton
        disabled={isEmpty}
        title="Add Tag"
        onClick={(_e) => addTag(tagName)}
      >
        <AddIcon />
      </IconButton>
    </Box>
  );
}

function TagsList() {
  const tags = useQuery("SELECT * FROM tags;") as Array<Tag>;
  return (
    <Box>
      {tags.map((tag) => (
        <TagItem tag={tag} key={tag.id} />
      ))}
    </Box>
  );
}

function TagItem({ tag }: { tag: Tag }) {
  const skdb = useSKDB();

  const del = async (tag: Tag) => {
    skdb.exec("DELETE FROM tags WHERE id = @id;", tag);
    skdb.exec("DELETE FROM tasks_tags WHERE tag_id = @id;", tag);
  };

  return (
    <Box className="tag">
      <Typography noWrap component="div" sx={{ flex: 1 }}>
        {tag.name}
      </Typography>
      <IconButton title="Delete" onClick={(_e) => del(tag)}>
        <DeleteIcon />
      </IconButton>
    </Box>
  );
}

function TagDropdown({ task }: { task: Task }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const skdb = useSKDB();

  const remainingTags = useQuery(
    "SELECT * FROM tags WHERE id NOT IN (SELECT tag_id FROM tasks_tags WHERE task_id = @id);",
    task,
  );
  const handleChange = async (id: string) => {
    skdb.exec("INSERT INTO tasks_tags VALUES (@task, @tag, 'read-write');", {
      task: task.id,
      tag: id,
    });
    handleClose();
  };
  return (
    <div>
      <Button
        className="tagsdd"
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        variant="outlined"
        disableElevation
        onClick={handleClick}
        startIcon={<TagIcon />}
        endIcon={<KeyboardArrowDownIcon />}
        disabled={remainingTags.length == 0}
        title="Tags"
      ></Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {remainingTags.map((tag: Tag) => (
          <MenuItem
            value={tag.id}
            key={tag.id}
            onClick={() => {
              handleChange(tag.id);
            }}
          >
            {tag.name}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}

function Tags({ task }: { task: Task }) {
  const skdb = useSKDB();

  const selectedTags = useQuery(
    "SELECT * FROM tags WHERE id IN (SELECT tag_id FROM tasks_tags WHERE task_id = @id);",
    task,
  );
  const del = (id: string) => {
    skdb.exec(
      "DELETE FROM tasks_tags WHERE task_id = @task_id AND tag_id = @tag_id;",
      { task_id: task.id, tag_id: id },
    );
  };

  return (
    <div className="tags">
      {selectedTags.map((tag: Tag) => {
        const handleDelete = () => del(tag.id);
        return (
          <Chip
            label={tag.name}
            key={tag.id}
            size="small"
            onDelete={handleDelete}
          />
        );
      })}
    </div>
  );
}

/************** LIKES ****************/

function Like(task: { taskId: string }) {
  const skdb = useSKDB();
  let currUserLikes = useQuery("SELECT 1 FROM likes WHERE task_id = @taskId", {
    taskId: task.taskId,
  });

  const onClick = async () => {
    const userID = skdb.currentUser;
    if (currUserLikes.length == 0) {
      skdb.exec("INSERT INTO likes VALUES (@taskId, @userID, @userID);", {
        taskId: task.taskId,
        userID,
      });
    } else {
      skdb.exec("DELETE FROM likes WHERE task_id = @taskId", {
        taskId: task.taskId,
      });
    }
  };

  let unique_likes = useQuery(
    "SELECT n FROM unique_likes WHERE task_id = @taskId",
    { taskId: task.taskId },
  );
  let like_count = unique_likes.length == 1 ? unique_likes[0].n : 0;
  return (
    <IconButton onClick={(_e) => onClick()}>
      <Badge badgeContent={like_count} color="success">
        {currUserLikes.length == 0 ? <HeartIcon /> : <FullHeartIcon />}
      </Badge>
    </IconButton>
  );
}

/************** Access Control ****************/

async function createGroup(
  skdb: SKDB,
  members: string[],
  perm: string = "rw",
): Promise<string> {
  const userID = skdb.currentUser;
  const groupID = (
    await skdb.exec(
      `BEGIN TRANSACTION;
         INSERT INTO skdb_groups VALUES (id('groupID'), @userID, @userID, @userID);
         SELECT id('groupID') AS groupID;
       COMMIT;`,
      { userID },
    )
  ).scalarValue();

  skdb.exec(
    "INSERT INTO skdb_group_permissions VALUES (@groupID, @userID, skdb_permission('rw'), @userID)",
    { groupID, userID },
  );

  skdb.exec(
    "UPDATE skdb_groups SET skdb_access = @groupID WHERE groupID = @groupID;",
    { groupID },
  );

  for (const member of members) {
    skdb.exec(
      "INSERT INTO skdb_group_permissions VALUES (@groupID, @member, skdb_permission(@perm), @groupID)",
      { groupID, member, perm },
    );
  }

  return groupID;
}

function VisibilityDropdown({
  accessList,
  setAccessList,
}: {
  accessList: string[];
  setAccessList: (l: string[]) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const skdb = useSKDB();
  const otherUsers = useQuery("SELECT * FROM users WHERE userID <> @userID;", {
    userID: skdb.currentUser,
  });

  const handleChange = async (uuid: string) => {
    if (accessList.includes(uuid)) {
      setAccessList(accessList.filter((e) => e !== uuid));
    } else {
      accessList.push(uuid);
      setAccessList(accessList);
    }
    handleClose();
  };
  return (
    <div>
      <Badge
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        badgeContent={otherUsers.length}
        color="primary"
      >
        <Badge badgeContent={accessList.length} color="success">
          <Button
            className="visibility"
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
            variant="outlined"
            disableElevation
            onClick={handleClick}
            startIcon={<VisibilityIcon />}
            endIcon={<KeyboardArrowDownIcon />}
            disabled={otherUsers.length == 0}
            title="Visibility"
          ></Button>
        </Badge>
      </Badge>
      <Menu
        className="users"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {otherUsers.map((user: User) => {
          return (
            <MenuItem
              value={user.userID}
              key={user.userID}
              onClick={() => {
                handleChange(user.userID);
              }}
            >
              <Checkbox checked={accessList.includes(user.userID)} />
              {user.userID}
            </MenuItem>
          );
        })}
      </Menu>
    </div>
  );
}

export default App;
