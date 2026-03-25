# Sprint 2 Report (2/22-3/24)

## YouTube link of Sprint:

## What's New (User Facing)
 * Solutions Approach
 * Requirements and Specifications
 * De-identification tool

## Work Summary (Developer Facing)
This sprint focused on the building of the de-identification tool. This tool has the ability to go through loads of student created documents and writings and redacts any personal information regarding that student from the document and converts them into .txt files.
This is essential since these documents are then going to be loaded into the local leaner corpus website for analysis.

## Unfinished Work
For the unfinished work we still need to ensure the de-identification tool is compatible with MacOS and the censoring works correctly. We also need to make the local learner corpus website and figure out how to get it associated with WSU.

## Completed Issues/User Stories
Here are links to the issues that we completed in this sprint:

 * [Redaction Logic](https://github.com/jjmoosman/CPTS_421_Project_ENG_DATA/issues/3)
 * [Adding Files](https://github.com/jjmoosman/CPTS_421_Project_ENG_DATA/issues/6)
 * [Output as txt](https://github.com/jjmoosman/CPTS_421_Project_ENG_DATA/issues/7)
 * [Select Destination Folder](https://github.com/jjmoosman/CPTS_421_Project_ENG_DATA/issues/8)
 * [Executable](https://github.com/jjmoosman/CPTS_421_Project_ENG_DATA/issues/5)
 
 ## Incomplete Issues/User Stories
 Here are links to issues we worked on but did not complete in this sprint:
 * [Censoring Edge Cases](https://github.com/jjmoosman/CPTS_421_Project_ENG_DATA/issues/1)
   There were too many edge cases and trying to fix them became difficult without becoming too generous with censoring things that was not meant to be censored
 * [MacOS Compatability](https://github.com/jjmoosman/CPTS_421_Project_ENG_DATA/issues/4)
   Each time we created an app file for MacOS it would not work on other Macs even if it ran fine during our testing

## Code Files for Review
Please review the following code files, which were actively developed during this sprint, for quality:
 * [app.py](https://github.com/jjmoosman/CPTS_421_Project_ENG_DATA/blob/main/Code/TestApp/app.py)
 
## Retrospective Summary
Here's what went well: 
  * Completing work by the deadline 
  * Meeting frequency with the team 
  * Coding sessions 
 
Here's what we'd like to improve: 
   * Our understanding of web developement
   * Our understanding of cross platform integration
  
Here are changes we plan to implement in the next sprint: 
   * We plan on creating a majority of the corpus website and its features
   * We plan on making the de-identification tool cross platform
