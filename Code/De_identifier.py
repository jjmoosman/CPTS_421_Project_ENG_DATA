

# #Hello World

# # https://www.pythonguis.com/tutorials/create-gui-tkinter/
# import tkinter as tk

# root = tk.Tk()

# # Setting some window properties
# root.title("Tk Example")
# root.configure(background="yellow")
# root.minsize(200, 200)
# root.maxsize(500, 500)
# root.geometry("300x300+50+50")

# # Create two labels
# tk.Label(root, text="Nothing will work unless you do.").pack()
# tk.Label(root, text="- Maya Angelou").pack()

# # Display an image
# image = tk.PhotoImage(file="025.gif") #don't really have an image this is just an example idea for a application
# tk.Label(root, image=image).pack()

# root.mainloop()


# https://realpython.com/python-menus-toolbars/#building-python-menu-bars-menus-and-toolbars-in-pyqt
# ^ this section of code was grabbed from ^
import sys

from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import QApplication, QLabel, QMainWindow

class Window(QMainWindow):
    """Main Window."""
    def __init__(self, parent=None):
        """Initializer."""
        super().__init__(parent)
        self.setWindowTitle("Python Menus & Toolbars")
        self.resize(400, 200)
        self.centralWidget = QLabel("Hello, World")
        self.centralWidget.setAlignment(Qt.AlignHCenter | Qt.AlignVCenter)
        self.setCentralWidget(self.centralWidget)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = Window()
    win.show()
    sys.exit(app.exec_())

# Functions we are looking into
# Glob for reading multiple files
# Qt5 & Qt6 for application development
# pandas & xlwings for excel file reading

# Functions of the application
# needs to be able to read excel files to grab student names 
# also needs user input for professors name
# after collecting student and professor names upload student files
# the program will go through and censor student and professor names
# the program will string compare student names to see if it gets any hits else notify user and or skip document.
# (also need edge cases to make sure we get misspelled names on documents)
# the scanning function should mainly scan the first 10-20 lines of the paper for student and professor names(entire file if we need to as a just in case)
# the program will create a copy of all of the papers with the censor in place
