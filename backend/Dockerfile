# Use an official Node.js runtime as a parent image
# Using Node 20 as specified in package.json and common for modern apps
FROM node:20-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json.
# If you have a package-lock.json, it's good practice to copy it too for reproducible builds.
# COPY package*-lock.json ./
COPY package.json ./backend

# Install app dependencies
# Using --only=production to avoid installing devDependencies
# --no-package-lock is used because the provided package.json does not suggest a lockfile,
# if you add one, remove --no-package-lock.
RUN npm install --only=production --no-package-lock

# Bundle app source
# This copies all files from the backend directory (where this Dockerfile should be)
# into the /usr/src/app directory in the image.
COPY . .

# Your app in server.js listens on process.env.PORT || 3001.
# Google Cloud Run automatically sets the PORT environment variable (typically to 8080).
# Your Node.js app will automatically use this PORT variable if set.
# Exposing 8080 is a good practice for Cloud Run.
EXPOSE 8080

# Define the command to run your app
# This uses the "start" script from your package.json if you prefer,
# or directly runs server.js.
# CMD [ "npm", "start" ]
CMD [ "node", "server.js" ]
