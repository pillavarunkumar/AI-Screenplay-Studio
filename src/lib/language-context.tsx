"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LANGUAGE } from "./language";

/** The open project's language, so every AI call can write in it. */
export const ProjectLanguageContext = createContext<string>(DEFAULT_LANGUAGE);

export const useProjectLanguage = () => useContext(ProjectLanguageContext);
