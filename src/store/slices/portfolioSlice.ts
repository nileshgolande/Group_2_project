import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface PortfolioHolding {
  id: string;
  symbol: string;
  quantity: number;
  averagePrice?: number;
}

export interface PortfolioState {
  holdings: PortfolioHolding[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PortfolioState = {
  holdings: [],
  isLoading: false,
  error: null,
};

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    setHoldings(state, action: PayloadAction<PortfolioHolding[]>) {
      state.holdings = action.payload;
      state.error = null;
    },
    addHolding(state, action: PayloadAction<PortfolioHolding>) {
      const idx = state.holdings.findIndex((h) => h.id === action.payload.id);
      if (idx >= 0) {
        state.holdings[idx] = action.payload;
      } else {
        state.holdings.push(action.payload);
      }
      state.error = null;
    },
    removeHolding(state, action: PayloadAction<string>) {
      state.holdings = state.holdings.filter((h) => h.id !== action.payload);
      state.error = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
  },
});

export const { setHoldings, addHolding, removeHolding, setLoading } =
  portfolioSlice.actions;

export default portfolioSlice.reducer;
