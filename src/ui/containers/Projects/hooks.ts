import React from 'react';

import type {Project} from '../../../shared/api/listProjects';

const FAVORITE_PROJECTS_KEY = 'favoriteProjects';

export const useFavoriteProjects = (projects?: Project[] | undefined) => {
    const [favoriteProjects, setFavoriteProjects] = React.useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(FAVORITE_PROJECTS_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const toggleFavorite = React.useCallback((projectKey: string) => {
        setFavoriteProjects((prev) => {
            const newFavorites = prev.includes(projectKey)
                ? prev.filter((key) => key !== projectKey)
                : [...prev, projectKey];

            localStorage.setItem(FAVORITE_PROJECTS_KEY, JSON.stringify(newFavorites));
            return newFavorites;
        });
    }, []);

    const isFavorite = React.useCallback(
        (projectKey: string) => {
            return favoriteProjects.includes(projectKey);
        },
        [favoriteProjects],
    );

    const [favoriteProjectsList, regularProjectsList] = React.useMemo(() => {
        const favorite: Project[] = [];
        const regular: Project[] = [];

        projects?.forEach((project) => {
            const projectKey = `${project.name}-${project.vcs}`;
            if (isFavorite(projectKey)) {
                favorite.push(project);
            } else {
                regular.push(project);
            }
        });

        return [favorite, regular];
    }, [projects, isFavorite]);

    return {
        favoriteProjects: favoriteProjectsList,
        regularProjects: regularProjectsList,
        toggleFavorite,
    };
};
