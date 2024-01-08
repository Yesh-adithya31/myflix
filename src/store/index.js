import {
  configureStore,
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
import axios from "axios";
import { API_KEY, TMDB_BASE_URL } from "../utils/constants";

const initialState = {
  movies: [],
  genresLoaded: false,
  genres: [],
  user: null,
  // userEmail: null,
  error: null,
};

export const loginUser = createAsyncThunk(
  "netflix/user",
  async (userData) => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:5001/api/users/login",
        userData
      );
      return response.data; // Ensure the response structure matches the expected 'user' property
    } catch (error) {
      // Handle error or return a default value if necessary
      throw error;
    }
  }
);

export const registerUser = createAsyncThunk(
  "netflix/registerUser",
  async (userData) => {
    const response = await axios.post(
      "http://127.0.0.1:5001/api/users/register",
      userData
    );
    return response.data;
  }
);

export const getGenres = createAsyncThunk(
  'netflix/genres',
  async (payload, { getState }) => {
    const type = payload?.type || 'movie'; // Get type from payload or default to 'all'
    const {
      data: { genres },
    } = await axios.get(`http://localhost:5003/api/discover/${type}/genre`);
    return genres;
  }
);

const createArrayFromRawData = (array, moviesArray, genres) => {
  array.forEach((movie) => {
    const movieGenres = [];
    movie.genre_ids.forEach((genre) => {
      const name = genres.find(({ id }) => id === genre);
      if (name) movieGenres.push(name.name);
    });
    if (movie.backdrop_path)
      moviesArray.push({
        id: movie.id,
        name: movie?.original_name ? movie.original_name : movie.original_title,
        image: movie.backdrop_path,
        genres: movieGenres.slice(0, 3),
      });
  });
};

const getRawData = async (api, genres, paging = false) => {
  const moviesArray = [];
  for (let i = 1; moviesArray.length < 60 && i < 10; i++) {
    const {
      data: { results },
    } = await axios.get(`${api}${paging ? `?page=${i}` : ""}`);
    createArrayFromRawData(results, moviesArray, genres);
  }
  return moviesArray;
};

export const fetchDataByGenre = createAsyncThunk(
  "netflix/genre",
  async ({ genre, type }, thunkAPI) => {
    const {
      netflix: { genres },
    } = thunkAPI.getState();

    console.log(genre +" and "+ type);
    return getRawData(
      `http://127.0.0.1:5003/api/discover/${type}/${genre}`,
      genres
    );
  }
);

export const fetchMovies = createAsyncThunk(
  "netflix/trending",
  async ({ type }, thunkAPI) => {
    const {
      netflix: { genres },
    } = thunkAPI.getState();
    return getRawData(
      `http://127.0.0.1:5003/api/discover/${type}`,
      genres,
      true
    );
  }
);

export const fetchVideoKey = createAsyncThunk(
  "netflix/videoKey",
  async (movieId) => {
    const response = await axios.get(
      `http://localhost:5003/api/discover/video/${movieId}`
    );
    const { key } = response.data;
    // Assuming there's at least one video available
    if (key) {
      return key; // Return the first video's key
    } else {
      return ""; // Or handle if there's no video key available
    }
  }
);

export const getUsersLikedMovies = createAsyncThunk(
  "netflix/getLiked",
  async (email) => {
    const {
      data: { movies },
    } = await axios.get(`http://localhost:5002/api/movies/liked/${email}`);
    return movies;
  }
);

export const removeMovieFromLiked = createAsyncThunk(
  "netflix/deleteLiked",
  async ({ movieId, email }) => {
    const {
      data: { movies },
    } = await axios.put("http://localhost:5002/api/movies/remove", {
      email,
      movieId,
    });
    return movies;
  }
);

const NetflixSlice = createSlice({
  name: "Netflix",
  initialState,
  reducers: {
    removeuser(state) {
      state.user = null; // Reset user to null when logging out
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getGenres.fulfilled, (state, action) => {
      state.genres = action.payload;
      state.genresLoaded = true;
    });
    builder.addCase(fetchMovies.fulfilled, (state, action) => {
      state.movies = action.payload;
    });
    builder.addCase(fetchDataByGenre.fulfilled, (state, action) => {
      state.movies = action.payload;
    });
    builder.addCase(getUsersLikedMovies.fulfilled, (state, action) => {
      state.movies = action.payload;
    });
    builder.addCase(removeMovieFromLiked.fulfilled, (state, action) => {
      state.movies = action.payload;
    });
    builder.addCase(fetchVideoKey.fulfilled, (state, action) => {
      state.videoKey = action.payload;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      if (action.payload) {
        state.user = action.payload.user;
        state.error = null;
      }
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.error = action.error.message;
    });
    builder.addCase(registerUser.fulfilled, (state, action) => {
      state.user = action.payload;
      state.error = null;
    });
    builder.addCase(registerUser.rejected, (state, action) => {
      state.error = action.error.message;
    });
  },
});

export const store = configureStore({
  reducer: {
    netflix: NetflixSlice.reducer,
  },
});

export const { removeUser, setMovies } = NetflixSlice.actions;
