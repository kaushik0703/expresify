import { ProjectForm } from "@/common.types";
import { createProjectMutation, createUserMutation, deleteProjectMutation, getProjectByIdQuery, getProjectsOfUserQuery, getUserQuery, projectsQuery, getAllProjectsQuery, updateProjectMutation } from "@/graphql";
import { GraphQLClient } from "graphql-request";

const isProduction = process.env.NODE_ENV === 'production';
const apiUrl = isProduction ? process.env.NEXT_PUBLIC_GRAFBASE_API_URL || "" : "http://127.0.0.1:4000/graphql"
const apiKey = isProduction ? process.env.NEXT_PUBLIC_GRAFBASE_API_KEY || "" : "letmein";
const serverUrl = isProduction ? process.env.NEXT_PUBLIC_SERVER_URL : 'http://localhost:3000'

const client = new GraphQLClient(apiUrl)

const makeGraphQLRequest = async(query: string, variables = {}) => {
    try {
        //client.request
        return await client.request(query, variables)
    } catch (error) {
        throw(error)
    }
}

export const getUser = (email: string) => {
    client.setHeader('x-api-key', apiKey);
    return makeGraphQLRequest(getUserQuery, {email})
}

export const createUser = (name: string, email: string, avatarUrl: string) => {
    client.setHeader('x-api-key', apiKey);
    const variables ={
        input: {
            name, email, avatarUrl
        }
    }
    return makeGraphQLRequest(createUserMutation, variables)
}

export const fetchToken = async () => {
    try {
        const response = await fetch(`${serverUrl}/api/auth/token`);
        return response.json();
    } catch (error) {
        throw error;
    }
}

export const uploadImage = async (imagePath: string) => {
    try {
        const response = await fetch(`${serverUrl}/api/upload`, {
            method: 'POST',
            body: JSON.stringify({ path: imagePath})
        })

        return response.json();
    } catch (error) {
        throw error;
    }
}

export const createNewProject = async (form: ProjectForm, creatorId: string, token: string) => {
    //first upload to cloudinary and get url from there
    const imageUrl = await uploadImage(form.image);

    if(imageUrl.url) {
        client.setHeader("Authorization", `Bearer ${token}`)
        const variables = {
            input : {
                ...form,
                image: imageUrl.url,
                createdBy: {
                    link: creatorId
                }
            }
        }

        return makeGraphQLRequest(createProjectMutation, variables)
    }
}

export const editProject = async (form: ProjectForm, projectId: string, token: string) => {
    function isBase64DataUrl(string: string): boolean {
        return (
            //if the string starts with either "data:image/" or "data:video/"
            //checks if the string ends with ";base64,"
            //checks if the string contains only valid base64 characters
          string.startsWith("data:image/") || 
          string.startsWith("data:video/") &&
          string.endsWith(";base64,") &&
          /^[A-Za-z0-9+/=]+$/.test(string)
        );
      }

      let updatedForm = {...form};

      const isUploadingNewImage = isBase64DataUrl(form.image)

      if(isUploadingNewImage) {
        const imageUrl = await uploadImage(form.image);
        
        if(imageUrl.url) {
            updatedForm = {
                ...form,
                image: imageUrl.url
            }
        }
    }

    const variables = {
        input: updatedForm,
        id: projectId
    }

    client.setHeader("Authorization", `Bearer ${token}`)
    
    return makeGraphQLRequest(updateProjectMutation, variables)
}

export const fetchAllProjects = async (category?: string, endCursor?: string) => {
    client.setHeader('x-api-key', apiKey);
    
    const variables ={
        category, endCursor
    }
    const first = 4
    return category? makeGraphQLRequest(projectsQuery, variables): makeGraphQLRequest(getAllProjectsQuery, {first});
    // return makeGraphQLRequest(projectsQuery, variables) //in place of variables we can write
}

export const getProjectDetails = (id: string) => {
    client.setHeader('x-api-key', apiKey);
    return makeGraphQLRequest(getProjectByIdQuery , {id})
}

export const getUserProjects = (id: string, last?: number) => {
    client.setHeader('x-api-key', apiKey);
    return makeGraphQLRequest(getProjectsOfUserQuery , {id, last})
}

export const deleteProject = async (id: string, token: string) => {
        client.setHeader("Authorization", `Bearer ${token}`)

        return makeGraphQLRequest(deleteProjectMutation, {id})
}
