import React from 'react';

import {DataManagerContext} from '@gravity-ui/data-source';
import {ThemeProvider, ToasterComponent, ToasterProvider} from '@gravity-ui/uikit';
import {QueryClientProvider} from '@tanstack/react-query';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';

import {ErrorBoundary} from '../components/ErrorBoundary/ErrorBoundary';
import {ReactQueryDevtools} from '../components/ReactQueryDevtools/ReactQueryDevtools';
import {dataManager} from '../components/data-source/data-manager';
import App from '../containers/App/App';
import {LanguageProvider} from '../services/language';
import {useAppTheme} from '../services/theme';
import {toaster} from '../services/toaster';

import '../styles/scaffolding.scss';

const container = document.getElementById('root');
const root = createRoot(container!);

function AppMain() {
    const {theme} = useAppTheme();

    return (
        <QueryClientProvider client={dataManager.queryClient}>
            <ReactQueryDevtools />
            <DataManagerContext.Provider value={dataManager}>
                <BrowserRouter>
                    <ToasterProvider toaster={toaster}>
                        <ThemeProvider theme={theme}>
                            <LanguageProvider>
                                <ErrorBoundary>
                                    <App />
                                    <ToasterComponent />
                                </ErrorBoundary>
                            </LanguageProvider>
                        </ThemeProvider>
                    </ToasterProvider>
                </BrowserRouter>
            </DataManagerContext.Provider>
        </QueryClientProvider>
    );
}

root.render(<AppMain />);
