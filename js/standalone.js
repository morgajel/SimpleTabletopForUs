$(document).ready(function() {
	/* data goes here */
	var data = [
			{id: 1, title: "Init: 1d20+4", result:"1", isPinned: false},
			{id: 2, title: "Attack: 1d20+7", result:"2", isPinned: true},
			{id: 3, title: "Damage: 9d6+14", result:"3", isPinned: false},
			{id: 4, title: "The Long Roller: 4d6+3d10-4d10+12d4+5+1+1+1+1d4+3-12d6+3+14-2+12",result:"3", isPinned: true}
		];
				
	function Task(data) {
		this.title = ko.observable(data.title);
		this.result = ko.observable(data.result);
		this.isPinned = ko.observable(data.isPinned);
		this.displayText = ko.computed(function(){
			return this.title() + " " + this.result();
		}, this);
	}

	function TaskListViewModel() {
		// Data
		var self = this;
		self.tasks = ko.observableArray([]);
		self.createRollText = ko.observable();		
		self.incompleteTasks = ko.computed(function() {
			return ko.utils.arrayFilter(self.tasks(), 
				function(task) { 
					return !task.isPinned() && !task._destroy;
				});
		});

		self.completeTasks = ko.computed(function(){
			return ko.utils.arrayFilter(self.tasks(), 
				function(task) { 
					return task.isPinned() && !task._destroy;
				});
		});

		// Operations
		self.removeUnpinned = function(howManyToRemove){			
			var t = self.tasks();
			var removed = 0;
			for (var i=0; i<t.length; i++){
				if (!t[i].isPinned()){
					self.tasks.splice(i,1);
					if (++removed >= howManyToRemove){
						break;
					}
				}
			}
		}
		self.removeExtraUnpinned = function(){
			var displayedRolls = self.incompleteTasks().length;
			if (displayedRolls > 5){
				self.removeUnpinned(displayedRolls - 5);
			}
		}
		self.addTask = function() {
			var rollResult = STFU.DiceRoller.roll(this.createRollText());
			self.tasks.push(new Task({ title: this.createRollText(),result: rollResult}));
			self.createRollText("");
			self.removeExtraUnpinned();
		};
		self.removeTask = function(task) { 
			self.tasks.destroy(task) 
		};
		self.reroll = function(task){	
			self.tasks.push(new Task({ title: task.title(),result: "re-roll result"}));			
			self.removeExtraUnpinned();
		};
		self.pushText = function(task){
			self.createRollText(task.title());
		};		
		
		self.removeCompleted = function(){
			self.tasks.destroyAll(self.completeTasks());
		};

		/* Load the data */
		var mappedTasks = $.map(data, function(item){
			return new Task(item);
		});

		self.tasks(mappedTasks);			
	}

	// Bind
	ko.applyBindings(new TaskListViewModel());	
});